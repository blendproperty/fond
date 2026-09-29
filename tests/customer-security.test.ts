import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {getDb,resetDbForTests} from '../src/lib/db';
import {signUp,logIn,resolveSession,checkPassword,hashPassword} from '../src/lib/auth';
import {saveProviderSecret} from '../src/lib/provider-secrets';
import {saveDocument} from '../src/lib/management';
import {beginCustomerLogin,completeCustomerLogin,beginPasswordReset,completePasswordReset,beginSecurityChange,completeSecurityChange,customerSecurity} from '../src/lib/customer-security';

process.env.FOND_DB_PATH=':memory:';
// All email and SMS deliveries in this suite are intercepted by the fixture below.

test('reset requests queue delivery after the HTTP response for both known and unknown emails',async()=>{
 const f=fixture();const work:Array<()=>Promise<void>>=[];
 const reset=await beginPasswordReset(f.user.email,fn=>work.push(fn));
 const unknown=await beginPasswordReset('nobody@example.test',fn=>work.push(fn));
 assert.equal(reset.message,unknown.message);assert.equal(delivered.length,0);assert.equal(work.length,2);
 for(const run of work)await run();
 assert.equal(delivered.length,1);completePasswordReset(reset.challenge,lastCode(),'replacement-password');
 assert.throws(()=>completePasswordReset(unknown.challenge,lastCode(),'replacement-password'));
});
test('password changed during login delivery cannot create a recovery-only challenge for old credentials',async()=>{
 const f=await enable();
 globalThis.fetch=(async()=>{getDb().prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword('replacement-password'),f.user.id);return Response.json({id:'test'});}) as typeof fetch;
 await assert.rejects(beginCustomerLogin(f.user.email,'customer-password'),/security changed/);
 assert.equal((getDb().prepare("SELECT COUNT(*) AS n FROM customer_auth_challenges WHERE purpose='login'").get() as {n:number}).n,0);
});
process.env.FOND_CREDENTIALS_KEY='d'.repeat(64);
const originalFetch=globalThis.fetch;
let delivered:{destination:string;text:string}[]=[];
beforeEach(()=>{
 resetDbForTests();delivered=[];
 saveProviderSecret('email-api','re_test_only','shared-admin');saveDocument('email-from','orders@fond.mid-point.co.za','shared-admin');
 saveProviderSecret('twilio-auth-token','a'.repeat(32),'shared-admin');saveDocument('twilio-sms-config',{accountSid:'AC'+'b'.repeat(32),sender:'+27820000000'},'shared-admin');
 globalThis.fetch=(async(url,options)=>{
  if(String(url).includes('resend.com')){const b=JSON.parse(String(options?.body));delivered.push({destination:b.to[0],text:b.text});return Response.json({id:'test-email'});}
  const b=new URLSearchParams(String(options?.body));delivered.push({destination:b.get('To')!,text:b.get('Body')!});return Response.json({sid:'test-sms'});
 }) as typeof fetch;
});
afterEach(()=>{globalThis.fetch=originalFetch;});
function fixture(email='customer@example.test'){const result=signUp(email,'customer-password');getDb().prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(new Date().toISOString(),result.user.id);return {...result,user:{...result.user,emailVerified:true}};}
function lastCode(){const match=delivered.at(-1)?.text.match(/\b\d{6}\b/);assert.ok(match);return match[0];}
async function enable(channel:'email'|'sms'='email'){const f=fixture();const c=await beginSecurityChange(f.user,{action:'enable',password:'customer-password',channel,phone:'0821234567'});const setupCode=lastCode();const result=completeSecurityChange(f.user,'enable',c.challenge,setupCode);return {...f,...result,setupCode};}

test('optional security leaves ordinary sign-in available and never accepts a wrong password',async()=>{
 const f=fixture();assert.equal(customerSecurity(f.user.id).enabled,false);
 const login=await beginCustomerLogin(f.user.email,'customer-password');assert.equal(resolveSession(login.token)?.id,f.user.id);
 await assert.rejects(beginCustomerLogin(f.user.email,'wrong-password'));assert.equal(delivered.length,0);
});
test('email setup requires password, verified email and code; enabling rotates all sessions',async()=>{
 const f=signUp('new@example.test','customer-password');
 await assert.rejects(beginSecurityChange(f.user,{action:'enable',password:'wrong',channel:'email'}));
 await assert.rejects(beginSecurityChange(f.user,{action:'enable',password:'customer-password',channel:'email'}),/Verify/);
 getDb().prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(new Date().toISOString(),f.user.id);
 const c=await beginSecurityChange(f.user,{action:'enable',password:'customer-password',channel:'email'});
 assert.equal(customerSecurity(f.user.id).enabled,false);
 assert.throws(()=>completeSecurityChange(f.user,'enable',c.challenge,'invalid'));
 const result=completeSecurityChange(f.user,'enable',c.challenge,lastCode());
 assert.equal(resolveSession(f.token),null);assert.ok(resolveSession(result.token));assert.equal(result.recoveryCodes.length,8);
 assert.equal(customerSecurity(f.user.id).enabled,true);
 const stored=getDb().prepare('SELECT recovery_json FROM customer_two_factor').get() as {recovery_json:string};
 assert.ok(!stored.recovery_json.includes(result.recoveryCodes[0]));
});
test('two-factor password step creates no session; only purpose-bound single-use code completes sign-in',async()=>{
 const f=await enable();assert.throws(()=>logIn(f.user.email,'customer-password'),/two-factor/);
 const before=getDb().prepare('SELECT COUNT(*) AS n FROM sessions').get();
 const challenge=await beginCustomerLogin(f.user.email,'customer-password');assert.ok(challenge.challenge);assert.equal(challenge.token,undefined);
 assert.deepEqual(getDb().prepare('SELECT COUNT(*) AS n FROM sessions').get(),before);
 assert.throws(()=>completePasswordReset(challenge.challenge! ,lastCode(),'replacement-password'),/expired/);
 const code=lastCode(),logged=completeCustomerLogin(challenge.challenge!,code);assert.equal(logged.user.id,f.user.id);
 assert.throws(()=>completeCustomerLogin(challenge.challenge!,code),/expired/);
});
test('SMS enrollment verifies chosen number, sign-in ignores unverified reward notification phone',async()=>{
 const f=await enable('sms');assert.equal(delivered.at(-1)?.destination,'+27821234567');assert.equal(customerSecurity(f.user.id).channel,'sms');
 getDb().prepare('INSERT OR REPLACE INTO loyalty_preferences VALUES (?,1,1,?)').run(f.user.id,'+27829999999');
 const c=await beginCustomerLogin(f.user.email,'customer-password');assert.equal(delivered.at(-1)?.destination,'+27821234567');assert.equal(c.destination,'•••• 4567');
 assert.ok(completeCustomerLogin(c.challenge!,lastCode()).token);
});
test('wrong code attempts and expiry are enforced across requests',async()=>{
 const f=await enable(),c=await beginCustomerLogin(f.user.email,'customer-password'),right=lastCode();
 for(let i=0;i<5;i++)assert.throws(()=>completeCustomerLogin(c.challenge!,'invalid'),/Incorrect/);
 assert.throws(()=>completeCustomerLogin(c.challenge!,right),/expired/);
 const next=await beginCustomerLogin(f.user.email,'customer-password');getDb().prepare('UPDATE customer_auth_challenges SET expires_at=0').run();
 assert.throws(()=>completeCustomerLogin(next.challenge!,lastCode()),/expired/);
});
test('recovery code works once and never without the correct password',async()=>{
 const f=await enable(),c=await beginCustomerLogin(f.user.email,'customer-password');
 assert.ok(completeCustomerLogin(c.challenge!,f.recoveryCodes[0]).token);
 const next=await beginCustomerLogin(f.user.email,'customer-password');assert.throws(()=>completeCustomerLogin(next.challenge!,f.recoveryCodes[0]),/Incorrect/);
 await assert.rejects(beginCustomerLogin(f.user.email,'wrong-password'));
});
test('password reset response does not reveal account existence, revokes sessions, and retains MFA',async()=>{
 const f=await enable('sms'),reset=await beginPasswordReset(f.user.email),code=lastCode();
 const unknown=await beginPasswordReset('unknown@example.test');assert.equal(reset.message,unknown.message);assert.equal(reset.challenge.length,unknown.challenge.length);
 completePasswordReset(reset.challenge,code,'replacement-password');assert.equal(resolveSession(f.token),null);assert.equal(customerSecurity(f.user.id).enabled,true);
 assert.throws(()=>checkPassword(f.user.email,'customer-password'));
 const login=await beginCustomerLogin(f.user.email,'replacement-password');assert.ok(login.twoFactorRequired);assert.equal(login.token,undefined);
 assert.throws(()=>completePasswordReset(reset.challenge,code,'another-password'));
});
test('security changes require current second factor, reject another account and invalidate pending login',async()=>{
 const f=await enable(),login=await beginCustomerLogin(f.user.email,'customer-password'),loginCode=lastCode();
 const disable=await beginSecurityChange(f.user,{action:'disable',password:'customer-password'}),code=lastCode();
 const other=fixture('other@example.test');
 assert.throws(()=>completeSecurityChange(other.user,'disable',disable.challenge,code),/expired/);
 assert.throws(()=>completeSecurityChange(f.user,'disable',disable.challenge,'invalid'),/Incorrect/);
 const result=completeSecurityChange(f.user,'disable',disable.challenge,code);assert.equal(customerSecurity(f.user.id).enabled,false);assert.ok(resolveSession(result.token));assert.equal(resolveSession(f.token),null);
 assert.throws(()=>completeCustomerLogin(login.challenge!,loginCode),/expired/);
});
test('resends supersede old challenge and limit delivery attempts',async()=>{
 const f=fixture(),old=await beginPasswordReset(f.user.email),oldCode=lastCode(),next=await beginPasswordReset(f.user.email);
 assert.throws(()=>completePasswordReset(old.challenge,oldCode,'new-password'),/expired/);
 assert.equal(delivered.length,2);
 for(let i=0;i<3;i++)await beginPasswordReset(f.user.email);
 await assert.rejects(beginPasswordReset(f.user.email),/Too many/);
 assert.equal(delivered.length,5);assert.ok(next.challenge);
});
test('provider failures leave setup off; existing MFA permits recovery but no password-only fallback',async()=>{
 const f=await enable('sms');globalThis.fetch=(async()=>{throw new Error('provider offline');}) as typeof fetch;
 const c=await beginCustomerLogin(f.user.email,'customer-password');assert.equal(c.deliveryFailed,true);assert.equal(c.token,undefined);
 assert.throws(()=>completeCustomerLogin(c.challenge!,'123456'));assert.ok(completeCustomerLogin(c.challenge!,f.recoveryCodes[0]).token);
 const second=fixture('second@example.test');await assert.rejects(beginSecurityChange(second.user,{action:'enable',password:'customer-password',channel:'email'}),/Could not send/);assert.equal(customerSecurity(second.user.id).enabled,false);
});
test('in-flight delivery cannot enable MFA or authorize old password after account state changes',async()=>{
 const f=fixture();globalThis.fetch=(async()=>{getDb().prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword('replacement-password'),f.user.id);return Response.json({id:'test'});}) as typeof fetch;
 await assert.rejects(beginSecurityChange(f.user,{action:'enable',password:'customer-password',channel:'email'}),/Could not send/);
 assert.equal(customerSecurity(f.user.id).enabled,false);
});
test('password reset invalidates a previously issued login code and stores only token/code hashes',async()=>{
 const f=await enable(),login=await beginCustomerLogin(f.user.email,'customer-password'),loginCode=lastCode();
 const hash=createHash('sha256').update(login.challenge!).digest('hex'),row=getDb().prepare('SELECT * FROM customer_auth_challenges WHERE id=?').get(hash) as {id:string;code_hash:string};
 assert.equal(row.id,hash);assert.notEqual(row.code_hash,loginCode);assert.equal(row.code_hash.length,64);
 const reset=await beginPasswordReset(f.user.email);completePasswordReset(reset.challenge,lastCode(),'replacement-password');
 assert.throws(()=>completeCustomerLogin(login.challenge!,loginCode),/expired/);
});
