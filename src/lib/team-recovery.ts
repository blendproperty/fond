import {createHash,createHmac,randomBytes,randomInt,scryptSync,timingSafeEqual} from 'node:crypto';
import {getDb} from './db';
import {normalizeEmail} from './auth';
import {authenticateMember} from './team';
import {emailConfigured,sendEmailMessage} from './email';
import {audit} from './management';

type Purpose='verify'|'reset';
type Challenge={id:string;member_id:string;purpose:Purpose;email:string;code_hash:string;state_hash:string;attempts:number;expires_at:number;ready:number};
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const token=()=>randomBytes(32).toString('hex');
function mac(value:string){const key=process.env.FOND_CREDENTIALS_KEY;if(!key||!/^[a-f0-9]{64}$/i.test(key))throw new Error('Team recovery is temporarily unavailable.');return createHmac('sha256',Buffer.from(key,'hex')).update(value).digest('hex');}
function same(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function state(memberId:string){
 const db=getDb(),member=db.prepare('SELECT id,username,password_hash,role,active FROM team_members WHERE id=? AND active=1').get(memberId);
 if(!member)throw new Error('Account access changed. Start again.');
 const recovery=db.prepare('SELECT email,verified_at FROM team_recovery_emails WHERE member_id=?').get(memberId);
 const approved=db.prepare('SELECT email,approved_at FROM team_recovery_approved WHERE member_id=?').get(memberId);
 const factor=db.prepare('SELECT hex(ciphertext) AS secret,active FROM team_two_factor WHERE member_id=?').get(memberId);
 return mac(JSON.stringify([member,recovery??null,approved??null,factor??null]));
}
function limit(key:string,max:number,windowMs=3600000){
 const db=getDb(),now=Date.now();db.prepare('DELETE FROM team_recovery_limits WHERE expires_at<=?').run(now);
 const row=db.prepare('INSERT INTO team_recovery_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').get(digest(key),now+windowMs) as {count:number};
 if(row.count>max)throw new Error('Too many attempts. Please try again later.');
}
export function teamRecoveryStatus(memberId:string){const row=getDb().prepare('SELECT email FROM team_recovery_emails WHERE member_id=?').get(memberId) as {email:string}|undefined;return {email:row?.email??null,emailAvailable:emailConfigured()};}
async function issue(memberId:string,purpose:Purpose,email:string,suppliedToken=token()){
 limit(`send:${memberId}:${purpose}`,5);limit(`destination:${email}`,10);limit('total-delivery',500);
 if(!emailConfigured())throw new Error('Email recovery is temporarily unavailable. Please try again later.');
 const db=getDb(),id=digest(suppliedToken),code=String(randomInt(0,1000000)).padStart(6,'0'),snapshot=state(memberId);
 db.prepare('DELETE FROM team_recovery_challenges WHERE expires_at<=? OR (member_id=? AND purpose=?)').run(Date.now(),memberId,purpose);
 db.prepare('INSERT INTO team_recovery_challenges (id,member_id,purpose,email,code_hash,state_hash,expires_at) VALUES (?,?,?,?,?,?,?)').run(id,memberId,purpose,email,mac(`${id}:${code}`),snapshot,Date.now()+10*60000);
 const action=purpose==='verify'?'verify your team recovery email':'reset your team password';
 const text=`Midpoint Hub\n\nYour code to ${action} is ${code}.\n\nEnter it in the team workspace. It expires in 10 minutes. Never share this code. If you did not request it, ignore this email. Your authenticator settings will stay unchanged.`;
 try{
  await sendEmailMessage(email,{subject:purpose==='verify'?'Verify your Midpoint Hub team recovery email':'Reset your Midpoint Hub team password',text,html:`<div style="font-family:Arial,sans-serif;color:#123d33;max-width:520px;padding:24px"><h1 style="font-size:24px">Midpoint Hub</h1><p>Your code to ${action}:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold">${code}</p><p>Enter it in the team workspace within 10 minutes. Never share this code.</p><p>If you did not request it, ignore this email. Your authenticator settings will stay unchanged.</p></div>`},`team-recovery-${id}`,'Midpoint Hub');
  if(!same(snapshot,state(memberId))||!db.prepare('UPDATE team_recovery_challenges SET ready=1 WHERE id=?').run(id).changes)throw new Error('Account changed');
 }catch{db.prepare('DELETE FROM team_recovery_challenges WHERE id=?').run(id);throw new Error('Could not send your code. Please try again later.');}
 return {challenge:suppliedToken,message:'Code sent. Check your inbox and spam folder.'};
}
export async function beginRecoveryEmail(memberId:string,input:{email:string;password:string;twoFactorCode?:string}){
 const email=normalizeEmail(input.email),db=getDb();limit(`verify-password:${memberId}`,15,15*60000);
 const member=db.prepare('SELECT username FROM team_members WHERE id=? AND active=1').get(memberId) as {username:string}|undefined;
 if(!member||authenticateMember(member.username,input.password,input.twoFactorCode)?.id!==memberId)throw new Error('Check your current password and authenticator or recovery code.');
 return issue(memberId,'verify',email);
}
export async function beginTeamPasswordReset(username:string,background?:(work:()=>Promise<void>)=>void){
 const normalized=username.trim().toLowerCase();limit(`reset:${normalized}`,5);limit('total-reset-requests',1000);
 if(!emailConfigured())throw new Error('Email recovery is temporarily unavailable. Please try again later.');
 const challenge=token();
 const deliver=async()=>{
  const row=getDb().prepare('SELECT m.id,COALESCE(r.email,a.email) AS email FROM team_members m LEFT JOIN team_recovery_emails r ON r.member_id=m.id LEFT JOIN team_recovery_approved a ON a.member_id=m.id WHERE m.username=? AND m.active=1 AND COALESCE(r.email,a.email) IS NOT NULL').get(normalized) as {id:string;email:string}|undefined;
  if(row){try{await issue(row.id,'reset',row.email,challenge);}catch{/* Known, unknown and unavailable accounts receive the same response. */}}
 };
 if(background)background(deliver);else await deliver();
 return {challenge,message:'If this team account has a recovery email, a reset code is on its way. Check your inbox and spam folder.'};
}
function consume(challenge:string,code:string,purpose:Purpose,memberId?:string){
 const db=getDb(),row=db.prepare('SELECT * FROM team_recovery_challenges WHERE id=?').get(digest(challenge)) as Challenge|undefined;
 if(!row||row.purpose!==purpose||(memberId&&row.member_id!==memberId)||!row.ready||row.expires_at<=Date.now()||row.attempts>=5||!same(row.state_hash,state(row.member_id)))throw new Error('This code expired or is no longer valid. Start again.');
 if(purpose==='reset'){const destination=db.prepare('SELECT COALESCE(r.email,a.email) AS email FROM team_members m LEFT JOIN team_recovery_emails r ON r.member_id=m.id LEFT JOIN team_recovery_approved a ON a.member_id=m.id WHERE m.id=?').get(row.member_id) as {email:string|null}|undefined;if(!destination?.email||destination.email!==row.email)throw new Error('This code expired or is no longer valid. Start again.');}
 db.prepare('UPDATE team_recovery_challenges SET attempts=attempts+1 WHERE id=?').run(row.id);
 if(!/^\d{6}$/.test(code)||!same(row.code_hash,mac(`${row.id}:${code}`)))throw new Error('Incorrect code. Please try again.');
 return row;
}
function finish(row:Challenge,work:()=>void){
 const db=getDb();db.exec('BEGIN IMMEDIATE');try{
  if(!db.prepare('DELETE FROM team_recovery_challenges WHERE id=?').run(row.id).changes)throw new Error('This code has already been used.');
  work();db.prepare('DELETE FROM team_sessions WHERE member_id=?').run(row.member_id);db.prepare('DELETE FROM team_recovery_challenges WHERE member_id=?').run(row.member_id);db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function completeRecoveryEmail(memberId:string,challenge:string,code:string){
 const row=consume(challenge,code,'verify',memberId);
 finish(row,()=>{getDb().prepare('DELETE FROM team_recovery_approved WHERE member_id=?').run(memberId);getDb().prepare('INSERT INTO team_recovery_emails VALUES (?,?,?) ON CONFLICT(member_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at').run(memberId,row.email,new Date().toISOString());audit(`team:${memberId}`,'team-recovery-email-verified',memberId);});
}
export function completeTeamPasswordReset(challenge:string,code:string,password:string){
 if(password.length<12||password.length>128)throw new Error('Use a password of 12–128 characters.');
 const row=consume(challenge,code,'reset'),salt=randomBytes(16).toString('hex'),hash=salt+':'+scryptSync(password,salt,64).toString('hex');
 finish(row,()=>{const db=getDb();const approved=db.prepare('SELECT email FROM team_recovery_approved WHERE member_id=?').get(row.member_id) as {email:string}|undefined;const verified=db.prepare('SELECT email FROM team_recovery_emails WHERE member_id=?').get(row.member_id) as {email:string}|undefined;if(!verified && approved?.email===row.email){db.prepare('INSERT INTO team_recovery_emails VALUES (?,?,?)').run(row.member_id,row.email,new Date().toISOString());db.prepare('DELETE FROM team_recovery_approved WHERE member_id=?').run(row.member_id);audit(`team:${row.member_id}`,'team-recovery-email-verified',row.member_id);}db.prepare('UPDATE team_members SET password_hash=? WHERE id=?').run(hash,row.member_id);audit(`team:${row.member_id}`,'team-password-reset',row.member_id);});
}
