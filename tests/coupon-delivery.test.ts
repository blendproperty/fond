import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {getDb,resetDbForTests} from '../src/lib/db';
import {issueCoupons,revokeCoupon,couponSettings} from '../src/lib/coupons';
import {sendCouponEmail,checkCouponEmail,couponEmailStatus} from '../src/lib/coupon-delivery';
import {saveProviderSecret} from '../src/lib/provider-secrets';
import {saveDocument} from '../src/lib/management';
process.env.FOND_DB_PATH=':memory:';process.env.FOND_CREDENTIALS_KEY='ab'.repeat(32);process.env.FOND_COUPON_TESTING='true';
beforeEach(resetDbForTests);
const issue=()=>issueCoupons({emails:['coupon@example.test'],reason:'Testing',percent:10,amountCents:0,validDays:30,requestKey:randomUUID()},'admin:test')[0];
function configure(){saveProviderSecret('email-api','re_test-coupon-secret-not-real','test');saveDocument('email-from','orders@fond.mid-point.co.za','test');}
test('manual creation stays unsent; explicit send delivers exact branded coupon once across concurrent retries',async()=>{
 configure();const reward=issue();assert.equal(couponEmailStatus(reward.id),undefined);const original=global.fetch;const calls:{url:string;init:RequestInit|undefined}[]=[];
 global.fetch=async(url,init)=>{calls.push({url:String(url),init});return Response.json({id:'provider-coupon-id'});};
 try{
  await Promise.allSettled([sendCouponEmail(reward.id,'admin:test'),sendCouponEmail(reward.id,'admin:test')]);await sendCouponEmail(reward.id,'admin:test');
  assert.equal(calls.length,1);const body=JSON.parse(String(calls[0].init?.body));assert.deepEqual(body.to,['coupon@example.test']);assert.match(body.html,new RegExp(reward.code));assert.match(body.html,/midpoint-cafe-powered-by-fond/);assert.match(body.subject,/\[TEST\]/);assert.match(body.text,/10% off/);assert.match(String((calls[0].init?.headers as Record<string,string>)['Idempotency-Key']),/^fond-coupon-/);assert.equal(couponEmailStatus(reward.id)?.status,'provider-accepted');assert.equal(couponSettings().enabled,false);
 }finally{global.fetch=original;}
});
test('missing provider, disabled coupons, revoked and expired coupons cannot send',async()=>{
 const reward=issue();await assert.rejects(sendCouponEmail(reward.id,'admin:test'),/not configured/);assert.equal(couponEmailStatus(reward.id),undefined);configure();
 delete process.env.FOND_COUPON_TESTING;try{await assert.rejects(sendCouponEmail(reward.id,'admin:test'),/disabled/);}finally{process.env.FOND_COUPON_TESTING='true';}
 getDb().prepare("UPDATE coupons SET expires_at='2020-01-01T00:00:00Z' WHERE reward_id=?").run(reward.id);await assert.rejects(sendCouponEmail(reward.id,'admin:test'),/unexpired/);revokeCoupon(reward.id,'admin:test');await assert.rejects(sendCouponEmail(reward.id,'admin:test'),/available/);
});
test('lost provider response stays unconfirmed and cannot trigger an automatic duplicate',async()=>{
 configure();const reward=issue(),original=global.fetch;let calls=0;global.fetch=async()=>{calls++;throw new Error('response lost');};
 try{assert.equal((await sendCouponEmail(reward.id,'admin:test')).status,'unconfirmed');await assert.rejects(sendCouponEmail(reward.id,'admin:test'),/already requested/);assert.equal(calls,1);}finally{global.fetch=original;}
});
test('delivery status distinguishes provider acceptance, delivery and bounce without sending again',async()=>{
 configure();const reward=issue(),original=global.fetch;let posts=0,event='delivered';global.fetch=async(url,init)=>{if(init?.method==='POST'){posts++;return Response.json({id:'provider-coupon-id'});}assert.match(String(url),/\/emails\/provider-coupon-id$/);return Response.json({id:'provider-coupon-id',to:['coupon@example.test'],last_event:event});};
 try{await sendCouponEmail(reward.id,'admin:test');assert.equal((await checkCouponEmail(reward.id)).status,'delivered');event='bounced';assert.equal((await checkCouponEmail(reward.id)).status,'bounced');await sendCouponEmail(reward.id,'admin:test');assert.equal(posts,1);assert.equal(couponSettings().enabled,false);}finally{global.fetch=original;}
});
test('provider check errors and mismatched recipients preserve the recorded state',async()=>{
 configure();const reward=issue(),original=global.fetch;global.fetch=async()=>Response.json({id:'provider-coupon-id'});
 try{await sendCouponEmail(reward.id,'admin:test');global.fetch=async()=>Response.json({id:'provider-coupon-id',to:['wrong@example.test'],last_event:'delivered'});await assert.rejects(checkCouponEmail(reward.id),/does not match/);global.fetch=async()=>new Response('',{status:403});await assert.rejects(checkCouponEmail(reward.id),/403/);assert.equal(couponEmailStatus(reward.id)?.status,'provider-accepted');}finally{global.fetch=original;}
});
test('sending-only provider credentials report their read restriction without resending',async()=>{
 configure();const reward=issue(),original=global.fetch;let posts=0;
 global.fetch=async(_url,init)=>{if(init?.method==='POST'){posts++;return Response.json({id:'provider-coupon-id'});}return Response.json({name:'restricted_api_key'},{status:401});};
 try{await sendCouponEmail(reward.id,'admin:test');await assert.rejects(checkCouponEmail(reward.id),/permits sending only/);assert.equal(posts,1);assert.equal(couponEmailStatus(reward.id)?.status,'provider-accepted');}finally{global.fetch=original;}
});
