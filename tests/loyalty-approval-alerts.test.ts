import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {getDb,resetDbForTests} from '../src/lib/db';
import {signUp} from '../src/lib/auth';
import {saveMember} from '../src/lib/team';
import {createOrder,recordPosEntry,updateOrderStatus} from '../src/lib/orders';
import {recordPayment} from '../src/lib/business-data';
import {couponSettings,saveCouponSettings,reconcileCoupons,reviewCouponCandidate,adminCoupons} from '../src/lib/coupons';
import {saveProviderSecret} from '../src/lib/provider-secrets';
import {saveDocument} from '../src/lib/management';
import {queueApprovalAlerts,queueTestApprovalAlerts,approvalNotificationStatus,approvalAlertMessage,processApprovalAlerts} from '../src/lib/loyalty-approval-alerts';
process.env.FOND_DB_PATH=':memory:';process.env.FOND_COUPON_TESTING='true';process.env.FOND_CREDENTIALS_KEY='ab'.repeat(32);process.env.FOND_PUBLIC_URL='https://midpointhub.com';
beforeEach(resetDbForTests);
const terms={enabled:true,days:2,percent:10,amountCents:500,validDays:30};
function roster(){for(const name of ['Ray','Ali','Michelle'])saveMember({name,username:name.toLowerCase()+'@midpointhub.com',role:'manager',active:true,password:'synthetic-fixture-password'},'shared-admin');}
function configure(){saveProviderSecret('email-api','re_synthetic-approval-alert-test','test');saveDocument('email-from','orders@fond.mid-point.co.za','test');}
function purchase(userId:string,day:string){const o=createOrder({customerName:'Synthetic approval test',contactNumber:'0821234567',collectionTime:'ASAP',source:'customer',userId,rewardEnvironment:'test',lines:[{id:'espresso-single',quantity:1}]});getDb().prepare('UPDATE orders SET created_at=? WHERE id=?').run(day,o.id);updateOrderStatus(o.id,'accepted');recordPosEntry(o.id,randomUUID(),'test');updateOrderStatus(o.id,'ready');recordPayment({orderId:o.id,amountCents:o.totalCents,method:'cash',reference:randomUUID()},'test');updateOrderStatus(o.id,'completed');return o;}
function select(){roster();const u=signUp('synthetic-customer@example.test','synthetic-fixture-password').user;getDb().prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(new Date().toISOString(),u.id);saveCouponSettings(terms,'test');getDb().prepare('UPDATE coupon_settings SET value=?').run(JSON.stringify({...couponSettings(),since:'2026-01-01T00:00:00Z'}));purchase(u.id,'2026-01-01T12:00:00Z');const last=purchase(u.id,'2026-01-02T12:00:00Z');return {u,last,id:String(adminCoupons().candidates[0].id)};}

test('paid streak selects a candidate, badges count it and three exact manager alerts send once without any coupon',async()=>{
 configure();const {u,id}=select();assert.equal(approvalNotificationStatus().pending,1);assert.equal(approvalNotificationStatus().alerts.length,3);assert.equal(adminCoupons().coupons.length,0);
 reconcileCoupons(u.id,'test');queueApprovalAlerts(id);assert.equal(approvalNotificationStatus().alerts.length,3);
 const original=global.fetch,bodies:Record<string,unknown>[]=[];global.fetch=async(_url,init)=>{bodies.push(JSON.parse(String(init?.body)));return Response.json({id:'synthetic-provider-'+bodies.length});};
 try{await Promise.all([processApprovalAlerts(),processApprovalAlerts()]);await processApprovalAlerts();assert.equal(bodies.length,3);assert.deepEqual(bodies.map(b=>(b.to as string[])[0]).sort(),['ali@midpointhub.com','michelle@midpointhub.com','ray@midpointhub.com']);for(const b of bodies){assert.match(String(b.subject),/awaiting approval/);assert.match(String(b.html),/midpoint-cafe-powered-by-fond/);assert.match(String(b.text),/https:\/\/midpointhub.com\/admin\?section=loyalty#coupon-approval-queue/);assert.ok(!String(b.text).includes(u.email));assert.ok(!String(b.text).includes('COUPON-'));assert.match(String(b.text),/separate manual action/);}assert.ok(approvalNotificationStatus().alerts.every(a=>a.status==='provider-accepted'));assert.equal(adminCoupons().coupons.length,0);assert.equal(getDb().prepare('SELECT count(*) n FROM loyalty_messages').get()?.n,0);}finally{global.fetch=original;}
 reviewCouponCandidate(id,'approved','admin:ray');assert.equal(approvalNotificationStatus().pending,0);assert.equal(adminCoupons().coupons.length,0);
});

test('outbox rolls back with qualification transaction rather than mailing an uncommitted selection',()=>{
 const {id}=select();getDb().prepare('DELETE FROM coupon_approval_alerts').run();getDb().exec('BEGIN IMMEDIATE');queueApprovalAlerts(id);assert.equal(approvalNotificationStatus().alerts.length,3);getDb().exec('ROLLBACK');assert.equal(approvalNotificationStatus().alerts.length,0);
});

test('approval, rejection, refund, changed email, off switch and revoked manager access suppress stale alerts',async()=>{
 for(const action of ['approve','reject','refund','email','off','disable-manager']){
  resetDbForTests();configure();const {u,last,id}=select();
  if(action==='approve'||action==='reject')reviewCouponCandidate(id,action==='approve'?'approved':'rejected','test');
  if(action==='refund')recordPayment({orderId:last.id,amountCents:1,method:'refund',reference:randomUUID()},'test');
  if(action==='email')getDb().prepare("UPDATE users SET email='changed@example.test' WHERE id=?").run(u.id);
  if(action==='off')saveCouponSettings({...terms,enabled:false},'test');
  if(action==='disable-manager')getDb().prepare("UPDATE team_members SET active=0 WHERE username='ray@midpointhub.com'").run();
  const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;return Response.json({id:'synthetic'});};
  try{await processApprovalAlerts();assert.equal(calls,action==='disable-manager'?2:0,action);assert.equal(adminCoupons().coupons.length,0);}finally{global.fetch=original;}
 }
});

test('unconfigured mail retains durable jobs, while uncertain responses are never sent twice',async()=>{
 select();await processApprovalAlerts();assert.ok(approvalNotificationStatus().alerts.every(a=>a.status==='pending'));configure();const original=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw new Error('lost provider response');};
 try{await processApprovalAlerts();await processApprovalAlerts();assert.equal(calls,3);assert.ok(approvalNotificationStatus().alerts.every(a=>a.status==='unconfirmed'));}finally{global.fetch=original;}
});

test('automation-off end-to-end test alerts are explicitly marked, idempotent and create no candidates or coupons',async()=>{
 roster();configure();const key=randomUUID();queueTestApprovalAlerts(key,'test');queueTestApprovalAlerts(key,'test');assert.equal(couponSettings().enabled,false);assert.equal(approvalNotificationStatus().pending,0);assert.equal(approvalNotificationStatus().alerts.length,3);
 const original=global.fetch,bodies:Record<string,unknown>[]=[];global.fetch=async(_url,init)=>{bodies.push(JSON.parse(String(init?.body)));return Response.json({id:'test-'+bodies.length});};
 try{await processApprovalAlerts();await processApprovalAlerts();assert.equal(bodies.length,3);assert.ok(bodies.every(b=>String(b.subject).startsWith('[TEST]')&&String(b.text).includes('No customer was selected')));assert.equal(couponSettings().enabled,false);assert.equal(adminCoupons().candidates.length,0);assert.equal(adminCoupons().coupons.length,0);}finally{global.fetch=original;}
});

test('test helpers fail closed for missing or downgraded managers, disabled coupon testing and unconfigured email',()=>{
 assert.throws(()=>queueTestApprovalAlerts(randomUUID(),'test'),/active manager/);roster();assert.throws(()=>queueTestApprovalAlerts(randomUUID(),'test'),/not configured/);configure();getDb().prepare("UPDATE team_members SET role='staff' WHERE username='ali@midpointhub.com'").run();assert.throws(()=>queueTestApprovalAlerts(randomUUID(),'test'),/active manager/);delete process.env.FOND_COUPON_TESTING;try{assert.throws(()=>queueTestApprovalAlerts(randomUUID(),'test'),/disabled/);}finally{process.env.FOND_COUPON_TESTING='true';}assert.equal(approvalNotificationStatus().alerts.length,0);
});

test('manager alert escapes names and discloses neither customer details nor any approval action URL',()=>{
 const b=approvalAlertMessage('<img src=x onerror=alert(1)>',false);assert.match(b.html,/&lt;img/);assert.ok(!b.html.includes('<img src=x'));assert.ok(!b.text.includes('action=approve'));assert.match(b.html,/Open approval queue/);
});
