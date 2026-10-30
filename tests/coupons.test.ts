import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {getDb,resetDbForTests} from '../src/lib/db';
import {signUp} from '../src/lib/auth';
import {createOrder,recordPosEntry,updateOrderStatus} from '../src/lib/orders';
import {recordPayment} from '../src/lib/business-data';
import {issueCoupons,couponSettings,couponRecipients,saveCouponSettings,reconcileCoupons,revokeCoupon,adminCoupons} from '../src/lib/coupons';
import {quoteReward,reconcileOrderRewards,sendCustomerReward,saveRewardPreferences,quoteCounterReward} from '../src/lib/loyalty';
import {getAvailableMenu} from '../src/lib/menu-store';
import {processRewardMessages} from '../src/lib/loyalty-messages';
process.env.FOND_DB_PATH=':memory:';
process.env.FOND_COUPON_TESTING='true';
beforeEach(resetDbForTests);
const terms={percent:10,amountCents:500,validDays:30};
function customer(email='coupon@example.com'){const u=signUp(email,'safe-test-password').user;getDb().prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(new Date().toISOString(),u.id);return u;}
function issue(emails=['coupon@example.com'],extra={}){return issueCoupons({...terms,emails,reason:'Loyalty testing',requestKey:randomUUID(),...extra},'admin:test');}
function order(userId:string,extra={}){return createOrder({customerName:'Coupon test',contactNumber:'0821234567',collectionTime:'ASAP',source:'customer',userId,rewardEnvironment:'test',lines:[{id:'espresso-single',quantity:1}],...extra});}
function complete(o:ReturnType<typeof order>){if(o.status==='received')updateOrderStatus(o.id,'accepted');recordPosEntry(o.id,randomUUID(),'test');updateOrderStatus(o.id,'ready');if(o.totalCents)recordPayment({orderId:o.id,amountCents:o.totalCents,method:'cash',reference:randomUUID()},'test');updateOrderStatus(o.id,'completed');}
function purchase(userId:string,day:string){const o=order(userId);getDb().prepare('UPDATE orders SET created_at=? WHERE id=?').run(day,o.id);complete(o);return o;}
function automation(){saveCouponSettings({...terms,enabled:true,days:2},'admin:test');const c=couponSettings();getDb().prepare('UPDATE coupon_settings SET value=?').run(JSON.stringify({...c,since:'2026-01-01T00:00:00Z'}));}
function coupons(){return adminCoupons().coupons;}
test('manual batch validates atomically, normalizes recipients and retries without duplicates',()=>{
 const requestKey=randomUUID(),r=issue([' A@example.com ','a@example.com','b@example.com'],{requestKey});assert.equal(r.length,2);
 assert.deepEqual(issue(['b@example.com','a@example.com'],{requestKey}),r);
 assert.throws(()=>issue(['c@example.com'],{requestKey}),/different/);
 assert.throws(()=>issue(['ok@example.com','bad']));assert.equal(coupons().length,2);
 for(const extra of [{percent:101},{amountCents:-1},{percent:0,amountCents:0},{validDays:0},{percent:1.5}])assert.throws(()=>issue(undefined,extra));
 assert.equal(coupons().length,2);assert.equal(coupons()[0].reason,'Loyalty testing');assert.equal(getDb().prepare('SELECT count(*) n FROM loyalty_messages').get()?.n,0);
});
test('recipient search lists registered accounts with verification status, bounds results and exposes no credentials',()=>{
 const db=getDb(),insert=db.prepare('INSERT INTO users (id,email,password_hash,created_at,email_verified_at) VALUES (?,?,?,?,?)');
 for(let n=0;n<53;n++)insert.run(randomUUID(),`customer${String(n).padStart(2,'0')}@example.test`,'test-only-not-a-password','2026-10-30',n%2?'2026-10-30':null);
 const first=couponRecipients('');assert.equal(first.recipients.length,50);assert.equal(first.hasMore,true);assert.deepEqual(Object.keys(first.recipients[0]).sort(),['email','verified']);
 assert.deepEqual(couponRecipients(' CUSTOMER01@EXAMPLE.TEST '),{recipients:[{email:'customer01@example.test',verified:true}],hasMore:false});assert.equal(couponRecipients('customer00').recipients[0].verified,false);
 assert.deepEqual(couponRecipients('%'),{recipients:[],hasMore:false});assert.deepEqual(couponRecipients('not-registered'),{recipients:[],hasMore:false});assert.throws(()=>couponRecipients('a'.repeat(101)),/100/);assert.equal(coupons().length,0);assert.equal(couponSettings().enabled,false);
});
test('percentage plus fixed saving spans lines without negative totals; expiry, ownership and live isolation apply',()=>{
 const u=customer(),other=customer('other@example.com'),r=issue(undefined,{percent:50,amountCents:100000})[0];
 const lines=[{id:'espresso-single',quantity:1},{id:'smashed-avo',quantity:1}],menu=getAvailableMenu();
 const q=quoteReward(u.id,'test',String(r.code),lines,menu);assert.equal(q.totalCents,0);
 assert.throws(()=>quoteReward(other.id,'test',String(r.code),lines,menu));assert.throws(()=>quoteReward(u.id,'live',String(r.code),lines,menu));assert.throws(()=>quoteCounterReward('test',String(r.code),lines,menu),/app only/);
 const o=order(u.id,{lines,rewardCode:r.code});assert.equal(o.totalCents,0);assert.ok(o.lines.every(l=>l.subtotalCents===0));assert.equal(o.lines.reduce((s,l)=>s+(l.rewardDiscountCents??0),0),q.discountCents);
 assert.throws(()=>order(u.id,{rewardCode:r.code}));updateOrderStatus(o.id,'cancelled');
 getDb().prepare("UPDATE coupons SET expires_at='2000-01-01' WHERE reward_id=?").run(r.id);assert.throws(()=>quoteReward(u.id,'test',String(r.code),lines,menu),/expired/);
});
test('discount order retains payable remainder and single-use redemption; coupon orders earn no coffee stamps',()=>{
 const u=customer(),r=issue()[0],menu=getAvailableMenu(),lines=[{id:'espresso-single',quantity:2}];const q=quoteReward(u.id,'test',String(r.code),lines,menu);
 const subtotal=menu.find(m=>m.id==='espresso-single')!.price*2;assert.equal(q.discountCents,Math.floor(subtotal*0.1)+500);
 const o=order(u.id,{lines,rewardCode:r.code});assert.equal(o.totalCents,q.totalCents);complete(o);assert.equal(coupons()[0].status,'redeemed');assert.throws(()=>order(u.id,{rewardCode:r.code}));assert.equal(getDb().prepare('SELECT credited FROM loyalty_orders WHERE order_id=?').get(o.id)?.credited,0);
});
test('automation defaults off, counts paid completed consecutive SA days once and refunds revoke unused coupons',()=>{
 const u=customer();assert.equal(couponSettings().enabled,false);purchase(u.id,'2025-12-01T12:00:00Z');assert.equal(coupons().length,0);automation();
 purchase(u.id,'2026-02-01T22:30:00Z');purchase(u.id,'2026-02-02T12:00:00Z');assert.equal(coupons().length,0);
 const next=purchase(u.id,'2026-02-02T22:30:00Z');assert.equal(coupons().length,1);reconcileOrderRewards(next.id);reconcileCoupons(u.id,'test');assert.equal(coupons().length,1);
 recordPayment({orderId:next.id,amountCents:1,method:'refund',reference:randomUUID()},'test');assert.equal(coupons()[0].status,'revoked');
});
test('missing days reset streak; live, unpaid and unverified purchases do not qualify; off stops issuance',()=>{
 const u=customer();automation();purchase(u.id,'2026-03-01T12:00:00Z');purchase(u.id,'2026-03-03T12:00:00Z');assert.equal(coupons().length,0);
 const pending=order(u.id);getDb().prepare("UPDATE orders SET created_at='2026-03-04T12:00:00Z',status='completed' WHERE id=?").run(pending.id);reconcileOrderRewards(pending.id);assert.equal(coupons().length,0);
 const live=order(u.id,{rewardEnvironment:'live'});getDb().prepare("UPDATE orders SET created_at='2026-03-04T12:00:00Z' WHERE id=?").run(live.id);complete(live);assert.equal(coupons().length,0);
 saveCouponSettings({...terms,enabled:false,days:2},'admin:test');purchase(u.id,'2026-03-04T12:00:00Z');assert.equal(coupons().length,0);
});
test('coupon email is preview-only even through customer resend or accidental queue insertion',async()=>{
 const u=customer(),r=issue()[0];saveRewardPreferences(u.id,{email:true,sms:false,phone:''});assert.throws(()=>sendCustomerReward(u.id,String(r.id)),/preview/);
 getDb().prepare("INSERT INTO loyalty_messages (id,reward_id,channel,recipient,updated_at) VALUES (?,?,'email',?,?)").run(randomUUID(),r.id,u.email,new Date().toISOString());
 const original=global.fetch;global.fetch=async()=>{throw new Error('No provider call allowed');};try{await processRewardMessages();assert.equal(getDb().prepare('SELECT status FROM loyalty_messages WHERE reward_id=?').get(r.id)?.status,'cancelled');}finally{global.fetch=original;}
 assert.match(String(coupons()[0].email_preview),/TEST ONLY/);revokeCoupon(String(r.id),'admin:test');assert.equal(coupons()[0].status,'revoked');assert.throws(()=>revokeCoupon(String(r.id),'admin:test'));
});
test('installing the scaffold does not enable coupons without an explicit test environment switch',()=>{
 const u=customer(),r=issue()[0];delete process.env.FOND_COUPON_TESTING;
 try{assert.equal(adminCoupons().testingEnabled,false);assert.throws(()=>issue(),/disabled/);assert.throws(()=>saveCouponSettings({...terms,enabled:true,days:2},'test'),/disabled/);assert.throws(()=>quoteReward(u.id,'test',r.code,[{id:'espresso-single',quantity:1}],getAvailableMenu()),/disabled/);reconcileCoupons(u.id,'test');assert.equal(coupons().length,1);}finally{process.env.FOND_COUPON_TESTING='true';}
});
test('refunds revoke an unused automated coupon even after automation is switched off',()=>{
 const u=customer();automation();purchase(u.id,'2026-04-01T12:00:00Z');const last=purchase(u.id,'2026-04-02T12:00:00Z');assert.equal(coupons()[0].status,'available');
 saveCouponSettings({...terms,enabled:false,days:2},'admin:test');recordPayment({orderId:last.id,amountCents:1,method:'refund',reference:randomUUID()},'test');assert.equal(coupons()[0].status,'revoked');
});
test('unverified users do not qualify and saving identical settings retains the test period',()=>{
 const u=customer();automation();const config=couponSettings();assert.equal(saveCouponSettings({enabled:true,days:2,percent:10,amountCents:500,validDays:30},'test').since,config.since);
 getDb().prepare('UPDATE users SET email_verified_at=NULL WHERE id=?').run(u.id);purchase(u.id,'2026-05-01T12:00:00Z');purchase(u.id,'2026-05-02T12:00:00Z');assert.equal(coupons().length,0);
});
test('a refunded or revoked reward cannot recycle its purchase days into overlapping coupons',()=>{
 const u=customer();automation();const first=purchase(u.id,'2026-06-01T12:00:00Z');purchase(u.id,'2026-06-02T12:00:00Z');purchase(u.id,'2026-06-03T12:00:00Z');assert.equal(coupons().length,1);
 recordPayment({orderId:first.id,amountCents:1,method:'refund',reference:randomUUID()},'test');assert.equal(coupons().length,1);assert.equal(coupons()[0].status,'revoked');
 purchase(u.id,'2026-06-04T12:00:00Z');assert.equal(coupons().length,2);reconcileCoupons(u.id,'test');assert.equal(coupons().length,2);
});
