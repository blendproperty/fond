import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {getDb,resetDbForTests} from '../src/lib/db';
import {saveMember,loginMember,teamSession} from '../src/lib/team';
import {beginRecoveryEmail,completeRecoveryEmail,beginTeamPasswordReset,completeTeamPasswordReset,teamRecoveryStatus} from '../src/lib/team-recovery';
import {saveProviderSecret} from '../src/lib/provider-secrets';
import {saveDocument} from '../src/lib/management';
import {beginTwoFactor,activateTwoFactor,twoFactorActive} from '../src/lib/two-factor';
import {createHmac} from 'node:crypto';
process.env.FOND_DB_PATH=':memory:';process.env.FOND_CREDENTIALS_KEY='d'.repeat(64);
const originalFetch=globalThis.fetch;let delivered:{to:string[];text:string}[]=[];
beforeEach(()=>{resetDbForTests();delivered=[];saveProviderSecret('email-api','re_test_only','shared-admin');saveDocument('email-from','orders@fond.mid-point.co.za','shared-admin');globalThis.fetch=(async(_url,options)=>{delivered.push(JSON.parse(String(options?.body)));return Response.json({id:'fixture-email'});}) as typeof fetch;});
afterEach(()=>{globalThis.fetch=originalFetch;});
function fixture(username='fixture-owner',role='owner'){const password='fixture-password';const id=saveMember({name:'Fixture',username,password,role,active:true},'shared-admin');return {id,password,username};}
function lastCode(){const code=delivered.at(-1)?.text.match(/\b\d{6}\b/)?.[0];assert.ok(code);return code;}
async function enroll(f=fixture()){
 const session=loginMember(f.username,f.password)!;
 const proof=await beginRecoveryEmail(f.id,{email:'fixture@example.test',password:f.password});assert.equal(teamRecoveryStatus(f.id).email,null);completeRecoveryEmail(f.id,proof.challenge,lastCode());assert.equal(teamSession(session.token),null);
 return f;
}
function otp(secret:string){let bits=0,value=0;const bytes:number[]=[];for(const char of secret){value=value*32+'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);bits+=5;if(bits>=8){bytes.push(Math.floor(value/2**(bits-8))&255);bits-=8;value%=2**bits;}}const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
test('verified email recovery revokes sessions, changes only its member and rejects reused codes',async()=>{
 const f=await enroll(),other=fixture('other-owner');const session=loginMember(f.username,f.password)!;
 const reset=await beginTeamPasswordReset(f.username),code=lastCode();assert.equal(delivered.at(-1)?.to[0],'fixture@example.test');
 assert.throws(()=>completeTeamPasswordReset(reset.challenge,code,'short'),/12/);
 completeTeamPasswordReset(reset.challenge,code,'replacement-password');assert.equal(teamSession(session.token),null);assert.equal(loginMember(f.username,f.password),null);assert.ok(loginMember(f.username,'replacement-password'));assert.ok(loginMember(other.username,other.password));assert.throws(()=>completeTeamPasswordReset(reset.challenge,code,'another-password'));
});
test('no reset for unverified, disabled or unknown accounts; same queued response and shape',async()=>{
 const f=fixture(),work:Array<()=>Promise<void>>=[];const known=await beginTeamPasswordReset(f.username,fn=>work.push(fn)),unknown=await beginTeamPasswordReset('unknown-user',fn=>work.push(fn));assert.equal(known.message,unknown.message);assert.equal(known.challenge.length,unknown.challenge.length);assert.equal(work.length,2);for(const run of work)await run();assert.equal(delivered.length,0);
 await enroll(f);getDb().prepare('UPDATE team_members SET active=0 WHERE id=?').run(f.id);const disabled=await beginTeamPasswordReset(f.username);assert.equal(disabled.message,unknown.message);assert.equal(delivered.length,1);
});
test('email verification requires current credentials and is bound to its member and purpose',async()=>{
 const f=fixture(),other=fixture('other-owner');await assert.rejects(beginRecoveryEmail(f.id,{email:'bad@example.test',password:'wrong-password'}),/password/);
 const proof=await beginRecoveryEmail(f.id,{email:'fixture@example.test',password:f.password}),code=lastCode();assert.throws(()=>completeRecoveryEmail(other.id,proof.challenge,code));assert.throws(()=>completeTeamPasswordReset(proof.challenge,code,'replacement-password'));completeRecoveryEmail(f.id,proof.challenge,code);assert.equal(teamRecoveryStatus(other.id).email,null);
 const update=await beginRecoveryEmail(f.id,{email:'new@example.test',password:f.password});assert.equal(teamRecoveryStatus(f.id).email,'fixture@example.test');completeRecoveryEmail(f.id,update.challenge,lastCode());assert.equal(teamRecoveryStatus(f.id).email,'new@example.test');
});
test('expiry, guessing limits, superseded codes and administrator changes invalidate reset',async()=>{
 const f=await enroll();let r=await beginTeamPasswordReset(f.username),code=lastCode();getDb().prepare('UPDATE team_recovery_challenges SET expires_at=0').run();assert.throws(()=>completeTeamPasswordReset(r.challenge,code,'replacement-password'));
 r=await beginTeamPasswordReset(f.username);code=lastCode();for(let i=0;i<5;i++)assert.throws(()=>completeTeamPasswordReset(r.challenge,code==='000000'?'111111':'000000','replacement-password'));assert.throws(()=>completeTeamPasswordReset(r.challenge,code,'replacement-password'));
 const old=await beginTeamPasswordReset(f.username),oldCode=lastCode();r=await beginTeamPasswordReset(f.username);assert.throws(()=>completeTeamPasswordReset(old.challenge,oldCode,'replacement-password'));code=lastCode();saveMember({...f,name:'Updated',role:'owner',active:true,password:'admin-reset-password'},'shared-admin');assert.throws(()=>completeTeamPasswordReset(r.challenge,code,'replacement-password'));await beginTeamPasswordReset(f.username);await assert.rejects(beginTeamPasswordReset(f.username),/Too many/);
});
test('provider failures and in-flight account changes never leave a usable challenge',async()=>{
 const f=await enroll();globalThis.fetch=(async()=>Response.json({message:'rejected'},{status:500})) as typeof fetch;const r=await beginTeamPasswordReset(f.username);assert.throws(()=>completeTeamPasswordReset(r.challenge,'000000','replacement-password'));assert.equal((getDb().prepare('SELECT COUNT(*) AS n FROM team_recovery_challenges').get() as {n:number}).n,0);
 globalThis.fetch=(async()=>{saveMember({...f,name:'Changed',role:'owner',active:true,password:'changed-password'},'shared-admin');return Response.json({id:'fixture'});}) as typeof fetch;
 const changed=await beginTeamPasswordReset(f.username);assert.throws(()=>completeTeamPasswordReset(changed.challenge,'000000','replacement-password'));
});
test('authenticator proof is required for enrollment and password recovery preserves two-factor',async()=>{
 const f=fixture(),setup=beginTwoFactor(f.id,f.username),recovery=activateTwoFactor(f.id,otp(setup.secret));await assert.rejects(beginRecoveryEmail(f.id,{email:'fixture@example.test',password:f.password}),/authenticator/);
 const proof=await beginRecoveryEmail(f.id,{email:'fixture@example.test',password:f.password,twoFactorCode:recovery[0]});completeRecoveryEmail(f.id,proof.challenge,lastCode());assert.equal(loginMember(f.username,f.password,recovery[0]),null);
 const reset=await beginTeamPasswordReset(f.username);completeTeamPasswordReset(reset.challenge,lastCode(),'replacement-password');assert.equal(twoFactorActive(f.id),true);assert.equal(loginMember(f.username,'replacement-password'),null);assert.ok(loginMember(f.username,'replacement-password',recovery[1]));
});
