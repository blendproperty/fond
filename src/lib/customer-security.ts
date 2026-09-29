import {createHash,createHmac,randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {getDb} from './db';
import {AuthError,checkPassword,createSession,hashPassword,normalizeEmail,type SessionUser} from './auth';
import {emailConfigured,sendEmailMessage} from './email';
import {buildAccountSecurityEmail} from './email-template';
import {smsConfigured,sendSmsText} from './sms';
import {normalizePhone} from './management';

type Channel='email'|'sms';
type Purpose='login'|'reset'|'enable'|'disable';
type Factor={user_id:string;channel:Channel;phone:string|null;recovery_json:string;version:string};
type Challenge={id:string;user_id:string;purpose:Purpose;channel:Channel;destination:string;code_hash:string;state_hash:string;attempts:number;expires_at:number;ready:number};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const randomToken=()=>randomBytes(32).toString('hex');
function mac(value:string){
 const key=process.env.FOND_CREDENTIALS_KEY;
 if(!key||!/^[a-f0-9]{64}$/i.test(key))throw new AuthError('Account security is temporarily unavailable. Please try again later.');
 return createHmac('sha256',Buffer.from(key,'hex')).update(value).digest('hex');
}
function same(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function factor(userId:string){return getDb().prepare('SELECT * FROM customer_two_factor WHERE user_id=?').get(userId) as Factor|undefined;}
function account(userId:string){
 const row=getDb().prepare('SELECT id,email,email_verified_at,password_hash FROM users WHERE id=?').get(userId) as {id:string;email:string;email_verified_at:string|null;password_hash:string}|undefined;
 if(!row)throw new AuthError('Account not found.');return row;
}
function state(userId:string){const u=account(userId);return mac(`${u.id}:${u.password_hash}:${u.email}:${u.email_verified_at}:${factor(userId)?.version??'off'}`);}
function mask(channel:Channel,value:string){return channel==='sms'?`•••• ${value.slice(-4)}`:value.replace(/^(.).*(@.*)$/,'$1•••$2');}
export function customerSecurity(userId:string){
 const f=factor(userId);
 return {enabled:!!f,channel:f?.channel??null,destination:f?mask(f.channel,f.channel==='sms'?f.phone!:account(userId).email):null,emailAvailable:emailConfigured(),smsAvailable:smsConfigured()};
}
// Durable account/destination limits also cover newly-created challenges and provider failures.
function limit(key:string,max:number,windowMs=3600000){
 const db=getDb(),now=Date.now(),hashed=digest(key);
 db.prepare('DELETE FROM customer_auth_limits WHERE expires_at<=?').run(now);
 const row=db.prepare('INSERT INTO customer_auth_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').get(hashed,now+windowMs) as {count:number};
 if(row.count>max)throw new AuthError('Too many attempts. Please try again later.');
}
export function passwordAttempt(email:string,password:string){
 const normalized=normalizeEmail(email);limit(`password:${normalized}`,15,15*60000);
 return checkPassword(normalized,password);
}
function transaction<T>(fn:()=>T):T{const db=getDb();db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
async function issue(user:SessionUser,purpose:Purpose,channel:Channel,destination:string,suppliedToken?:string){
 const db=getDb();limit(`send:${user.id}:${purpose}`,5);limit(`send-destination:${channel}:${destination}`,10);limit('security-delivery-total',500);
 if(channel==='email'?!emailConfigured():!smsConfigured())throw new AuthError(`${channel==='sms'?'SMS':'Email'} codes are temporarily unavailable. Please try again later.`);
 const token=suppliedToken??randomToken(),id=digest(token),code=String(randomInt(0,1000000)).padStart(6,'0'),snapshot=state(user.id);
 db.prepare('DELETE FROM customer_auth_challenges WHERE expires_at<=? OR (user_id=? AND purpose=?)').run(Date.now(),user.id,purpose);
 db.prepare('INSERT INTO customer_auth_challenges (id,user_id,purpose,channel,destination,code_hash,state_hash,expires_at) VALUES (?,?,?,?,?,?,?,?)').run(id,user.id,purpose,channel,destination,mac(`${id}:${code}`),snapshot,Date.now()+10*60000);
 try{
  if(channel==='email')await sendEmailMessage(destination,buildAccountSecurityEmail(code,purpose),`fond-security-${id}`);
  else {const action=purpose==='enable'?'enable SMS two-factor sign-in':purpose==='disable'?'turn off two-factor sign-in':'sign in';const result=await sendSmsText(destination,`FOND: ${code} is your code to ${action}. Expires in 10 minutes. Never share this code.`);if(!result.sent)throw new Error('SMS unavailable');}
  if(!same(snapshot,state(user.id)))throw new Error('Account changed');
  const changed=db.prepare('UPDATE customer_auth_challenges SET ready=1 WHERE id=?').run(id);
  if(!changed.changes)throw new Error('Superseded');
 }catch{db.prepare('DELETE FROM customer_auth_challenges WHERE id=?').run(id);throw new AuthError('Could not send your code. Please try again later.');}
 return {challenge:token,channel,destination:mask(channel,destination)};
}
function consume(token:string,code:string,purpose:Purpose,userId?:string){
 const db=getDb(),id=digest(token),row=db.prepare('SELECT * FROM customer_auth_challenges WHERE id=?').get(id) as Challenge|undefined;
 if(!row||row.purpose!==purpose||(userId&&row.user_id!==userId)||!row.ready||row.expires_at<=Date.now()||row.attempts>=5||!same(row.state_hash,state(row.user_id)))throw new AuthError('This code expired or is no longer valid. Start again.');
 // This update intentionally precedes the transaction so wrong guesses cannot roll it back.
 db.prepare('UPDATE customer_auth_challenges SET attempts=attempts+1 WHERE id=?').run(id);
 let recoveryHash:string|undefined;
 if(!/^\d{6}$/.test(code)||!same(row.code_hash,mac(`${id}:${code}`))){
  const f=factor(row.user_id),candidate=code.trim().toUpperCase();
  if((purpose==='login'||purpose==='disable')&&f&&/^[A-F0-9]{16}$/.test(candidate)){
   const hash=mac(`recovery:${row.user_id}:${candidate}`);
   if((JSON.parse(f.recovery_json) as string[]).some(item=>same(item,hash)))recoveryHash=hash;
  }
  if(!recoveryHash)throw new AuthError('Incorrect code. Please try again.');
 }
 return {row,recoveryHash};
}
function finishChallenge(row:Challenge,recoveryHash?:string){
 const db=getDb();
 if(!db.prepare('DELETE FROM customer_auth_challenges WHERE id=?').run(row.id).changes)throw new AuthError('This code has already been used.');
 if(recoveryHash){const f=factor(row.user_id)!;const codes=(JSON.parse(f.recovery_json) as string[]).filter(c=>!same(c,recoveryHash));db.prepare('UPDATE customer_two_factor SET recovery_json=? WHERE user_id=?').run(JSON.stringify(codes),row.user_id);}
}
export async function beginCustomerLogin(email:string,password:string){
 const user=passwordAttempt(email,password),f=factor(user.id);
 if(!f)return {user,token:createSession(user.id)};
 const snapshot=state(user.id);
 // A recovery code remains usable if the selected delivery provider is down.
 try{return {twoFactorRequired:true,...await issue(user,'login',f.channel,f.channel==='sms'?f.phone!:user.email)};}
 catch(error){
  // Do not mint fallback challenges when the durable send/guess limits are reached.
  if(error instanceof AuthError&&error.message.startsWith('Too many'))throw error;
  if(!same(snapshot,state(user.id)))throw new AuthError('Account security changed. Sign in again.');
  const token=randomToken(),id=digest(token);
  getDb().prepare('DELETE FROM customer_auth_challenges WHERE user_id=? AND purpose=?').run(user.id,'login');
  getDb().prepare('INSERT INTO customer_auth_challenges (id,user_id,purpose,channel,destination,code_hash,state_hash,expires_at,ready) VALUES (?,?,?,?,?,?,?,?,1)').run(id,user.id,'login',f.channel,f.channel==='sms'?f.phone!:user.email,mac(randomToken()),state(user.id),Date.now()+10*60000);
  return {twoFactorRequired:true,challenge:token,channel:f.channel,destination:mask(f.channel,f.channel==='sms'?f.phone!:user.email),deliveryFailed:true};
 }
}
export function completeCustomerLogin(token:string,code:string){
 const {row,recoveryHash}=consume(token,code,'login');
 return transaction(()=>{finishChallenge(row,recoveryHash);const u=account(row.user_id);return {token:createSession(u.id),user:{id:u.id,email:u.email,emailVerified:!!u.email_verified_at}};});
}
export async function beginPasswordReset(email:string,background?:(work:()=>Promise<void>)=>void){
 const normalized=normalizeEmail(email);limit(`reset:${normalized}`,5);
 if(!emailConfigured())throw new AuthError('Password recovery is temporarily unavailable. Please try again later.');
 const row=getDb().prepare('SELECT id,email,email_verified_at FROM users WHERE email=?').get(normalized) as {id:string;email:string;email_verified_at:string|null}|undefined;
 const challenge=randomToken();
 const deliver=async()=>{if(row){try{await issue({id:row.id,email:row.email,emailVerified:!!row.email_verified_at},'reset','email',row.email,challenge);}catch{/* Same response for known and unknown accounts, including delivery failures. */}}};
 // HTTP responses do not wait on provider delivery, which would reveal known emails by timing.
 if(background)background(deliver);else await deliver();
 return {challenge,message:'If an account exists for that email, a password reset code is on its way. Check your inbox and spam folder.'};
}
export function completePasswordReset(token:string,code:string,password:string){
 if(password.length<8||password.length>128)throw new AuthError('Password must be 8 to 128 characters.');
 const {row}=consume(token,code,'reset'),hashed=hashPassword(password);
 transaction(()=>{finishChallenge(row);const db=getDb();db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashed,row.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);db.prepare('DELETE FROM customer_auth_challenges WHERE user_id=?').run(row.user_id);});
}
export async function beginSecurityChange(user:SessionUser,input:{action:'enable'|'disable';password:string;channel?:Channel;phone?:string}){
 passwordAttempt(user.email,input.password);
 const f=factor(user.id);
 if(input.action==='disable'){
  if(!f)throw new AuthError('Two-factor sign-in is already off.');
  const snapshot=state(user.id);
  // Normal delivery works here; offline recovery can be entered using a recovery-only challenge.
  try{return await issue(user,'disable',f.channel,f.channel==='sms'?f.phone!:user.email);}
  catch(error){if(error instanceof AuthError&&error.message.startsWith('Too many'))throw error;if(!same(snapshot,state(user.id)))throw new AuthError('Account security changed. Start again.');const token=randomToken(),id=digest(token);getDb().prepare('DELETE FROM customer_auth_challenges WHERE user_id=? AND purpose=?').run(user.id,'disable');getDb().prepare('INSERT INTO customer_auth_challenges (id,user_id,purpose,channel,destination,code_hash,state_hash,expires_at,ready) VALUES (?,?,?,?,?,?,?,?,1)').run(id,user.id,'disable',f.channel,f.channel==='sms'?f.phone!:user.email,mac(randomToken()),snapshot,Date.now()+10*60000);return {challenge:token,channel:f.channel,destination:mask(f.channel,f.channel==='sms'?f.phone!:user.email),deliveryFailed:true};}
 }
 if(f)throw new AuthError('Turn off your current method before choosing a new one.');
 if(!account(user.id).email_verified_at)throw new AuthError('Verify your account email before enabling two-factor sign-in.');
 if(input.channel!=='email'&&input.channel!=='sms')throw new AuthError('Choose email or SMS.');
 const phone=input.channel==='sms'?normalizePhone(input.phone??''):'';
 if(input.channel==='sms'&&!/^\+[1-9]\d{7,14}$/.test(phone))throw new AuthError('Enter your mobile number with its country code.');
 return issue(user,'enable',input.channel,input.channel==='sms'?phone:user.email);
}
export function completeSecurityChange(user:SessionUser,action:'enable'|'disable',token:string,code:string){
 const {row,recoveryHash}=consume(token,code,action,user.id);
 return transaction(()=>{
  finishChallenge(row,recoveryHash);const db=getDb();let recoveryCodes:string[]=[];
  if(action==='enable'){
   if(factor(user.id))throw new AuthError('Account security changed. Start again.');
   recoveryCodes=Array.from({length:8},()=>randomBytes(8).toString('hex').toUpperCase());
   db.prepare('INSERT INTO customer_two_factor VALUES (?,?,?,?,?,?)').run(user.id,row.channel,row.channel==='sms'?row.destination:null,JSON.stringify(recoveryCodes.map(c=>mac(`recovery:${user.id}:${c}`))),randomToken(),new Date().toISOString());
  }else db.prepare('DELETE FROM customer_two_factor WHERE user_id=?').run(user.id);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);db.prepare('DELETE FROM customer_auth_challenges WHERE user_id=?').run(user.id);
  return {token:createSession(user.id),recoveryCodes};
 });
}
