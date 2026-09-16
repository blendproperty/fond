import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {getDb,resetDbForTests} from '../src/lib/db';
import {DEFAULT_SETTINGS,DEFAULT_CONTENT,saveDocument,settings,orderingAvailable,publicContent,validateSettings} from '../src/lib/management';
import {saveMember,loginMember,teamSession,revokeSession} from '../src/lib/team';
import {isValidAdminToken} from '../src/lib/admin-auth';
import {isValidStaffToken} from '../src/lib/staff-auth';
import {saveCustomer,customers,customerHistory,importCustomerFromOrder,recordPayment,finance,csv} from '../src/lib/business-data';
import {createOrder,updateOrderStatus,getOrderEvents} from '../src/lib/orders';
import {processPaymentEvent,verifyYocoSignature,createCheckout} from '../src/lib/payments';
import {processNotifications} from '../src/lib/notifications';
process.env.FOND_DB_PATH=':memory:';
beforeEach(()=>{resetDbForTests();delete process.env.YOCO_SECRET_KEY;delete process.env.YOCO_WEBHOOK_SECRET;delete process.env.FOND_WHATSAPP_TOKEN;delete process.env.FOND_ALLOW_TEST_PAYMENTS;});
const order=()=>createOrder({submissionKey:randomUUID(),customerName:'Test customer',lines:[{id:'espresso-single',quantity:1}],collectionTime:'ASAP',source:'customer',contactNumber:'0821234567',whatsappOptIn:true});
test('named roles enforce admin boundary, revoke on edit and logout',()=>{
 const id=saveMember({name:'Counter',username:'counter',password:'test-password-long',role:'staff',active:true},'shared-admin');
 const login=loginMember('counter','test-password-long')!;
 assert.ok(isValidStaffToken(login.token));assert.equal(isValidAdminToken(login.token),false);
 saveMember({id,name:'Counter',username:'counter',role:'manager',active:true},'shared-admin');
 assert.equal(teamSession(login.token),null);
 const manager=loginMember('counter','test-password-long')!;assert.ok(isValidAdminToken(manager.token));
 assert.throws(()=>saveMember({id,name:'Counter',username:'counter',role:'staff',active:false},'team:'+id),/own/);
 revokeSession(manager.token);assert.equal(teamSession(manager.token),null);
});
test('trading hours use Johannesburg and settings reject invalid values',()=>{
 const s={...DEFAULT_SETTINGS,enforceHours:true,openingTime:'07:00',closingTime:'17:00'};
 assert.ok(orderingAvailable(s,new Date('2026-09-15T05:00:00Z')));
 assert.equal(orderingAvailable(s,new Date('2026-09-15T15:00:00Z')),false);
 assert.throws(()=>validateSettings({...s,maxActiveOrders:0}));
 assert.throws(()=>validateSettings({...s,newOrderMinutes:0}));
 assert.throws(()=>validateSettings({...s,preparationWeightPercent:4}));
 assert.throws(()=>validateSettings({...s,preparationWeightPercent:9}));
});
test('stored legacy settings inherit new queue targets',()=>{
 const legacy={...DEFAULT_SETTINGS} as Partial<typeof DEFAULT_SETTINGS>;
 delete legacy.newOrderMinutes;delete legacy.paymentConfirmationMinutes;delete legacy.yocoEntryMinutes;delete legacy.readyDeliveryMinutes;delete legacy.readyCollectionMinutes;
 saveDocument('trading',legacy,'fixture');
 assert.equal(settings().newOrderMinutes,5);assert.equal(settings().readyDeliveryMinutes,10);
});
test('paused/capacity order intake rejects new orders but still permits unchanged retries',()=>{
 const request={submissionKey:randomUUID(),customerName:'Test',lines:[{id:'espresso-single',quantity:1}],collectionTime:'ASAP',source:'customer' as const,contactNumber:'0821234567'};
 const first=createOrder(request);saveDocument('trading',{...DEFAULT_SETTINGS,orderingEnabled:false},'admin');
 assert.equal(createOrder(request).id,first.id);assert.throws(order,/closed/);
 saveDocument('trading',{...DEFAULT_SETTINGS,maxActiveOrders:1},'admin');assert.throws(order,/capacity/);
});
test('preparing orders count toward kitchen capacity',()=>{
 const active=order();updateOrderStatus(active.id,'accepted');
 getDb().prepare("UPDATE orders SET pos_recorded_at=?,pos_reference=? WHERE id=?").run(new Date().toISOString(),'YOCO-CAPACITY',active.id);
 updateOrderStatus(active.id,'preparing');saveDocument('trading',{...DEFAULT_SETTINGS,maxActiveOrders:1},'admin');
 assert.throws(order,/capacity/);
});
test('customer import normalizes phone, links history and does not manufacture consent',()=>{
 const o=order();const id=importCustomerFromOrder(o.id,'admin');
 assert.equal(importCustomerFromOrder(o.id,'admin'),id);assert.equal(customerHistory(id).length,1);
 const c=customers()[0] as any;assert.equal(c.phone,'+27821234567');assert.equal(c.marketing_consent,0);
 assert.throws(()=>saveCustomer({...c,marketing_consent:1,consent_note:''},'admin'),/consent/);
 saveCustomer({...c,marketing_consent:1,consent_note:'Written consent 2026-09-15'},'admin');assert.equal((customers()[0] as any).marketing_consent,1);
});
test('drafts do not publish and promotion schedule filters inactive/expired content',()=>{
 const c={...DEFAULT_CONTENT,headline:'New headline',promotions:[{id:'p',title:'Expired',body:'',active:true,startsAt:'2020-01-01T00:00:00Z',endsAt:'2020-02-01T00:00:00Z'}]};
 saveDocument('content-draft',c,'admin');assert.equal(publicContent().headline,DEFAULT_CONTENT.headline);
 saveDocument('content-published',c,'admin');assert.equal(publicContent().headline,'New headline');assert.equal(publicContent().promotions.length,0);
});
test('payment ledger guards duplicate receipts, overpayments and refunds',()=>{
 const o=order(),p={orderId:o.id,amountCents:o.totalCents,method:'cash',reference:'receipt-one'};
 recordPayment(p,'admin');recordPayment(p,'admin');assert.throws(()=>recordPayment({...p,reference:'receipt-two'},'admin'),/exceeds/);
 recordPayment({...p,method:'refund',reference:'refund-one'},'admin');assert.throws(()=>recordPayment({...p,method:'refund',reference:'refund-two'},'admin'),/exceeds/);
 const f=finance('2020-01-01','2099-01-01');assert.equal(f.payments.length,2);assert.equal(f.summary.netReceipts,0);assert.equal(f.summary.outstanding,o.totalCents);
 assert.ok(csv([{name:'=FORMULA()'}]).includes("'=FORMULA"));
});
test('signed Yoco callbacks match amount/currency/mode and credit only once',()=>{
 const o=order();process.env.FOND_ALLOW_TEST_PAYMENTS='true';process.env.YOCO_SECRET_KEY='sk_test_fixture';process.env.YOCO_WEBHOOK_SECRET='whsec_'+Buffer.from('test-secret').toString('base64');
 getDb().prepare('INSERT INTO yoco_checkouts VALUES (?,?,?,?,?)').run(o.id,'ch_fixture','https://c.yoco.com/test','pending',new Date().toISOString());
 const event={id:'evt_one',type:'payment.succeeded',payload:{id:'pay_one',status:'succeeded',amount:o.totalCents,currency:'ZAR',mode:'test',metadata:{checkoutId:'ch_fixture'}}};
 const raw=JSON.stringify(event),timestamp=String(Math.floor(Date.now()/1000)),id='delivery_one';
 const signature=createHmac('sha256',Buffer.from('test-secret')).update(`${id}.${timestamp}.${raw}`).digest('base64');
 const headers=new Headers({'webhook-id':id,'webhook-timestamp':timestamp,'webhook-signature':'v1,'+signature});
 assert.ok(verifyYocoSignature(raw,headers));assert.equal(verifyYocoSignature(raw+' ',headers),false);assert.equal(verifyYocoSignature(raw,headers,Date.now()+600000),false);
 assert.throws(()=>processPaymentEvent({...event,payload:{...event.payload,amount:1}}));
 processPaymentEvent(event);processPaymentEvent(event);
 assert.equal(finance('2020-01-01','2099-01-01').summary.netReceipts,o.totalCents);
});
test('unconfigured online checkout fails closed',async()=>{await assert.rejects(()=>createCheckout(order().reference),/not available/);});
test('notification jobs are durable and unconfigured provider is visible without blocking statuses',async()=>{
 const o=order();updateOrderStatus(o.id,'accepted','received','team:test');
 assert.equal(getOrderEvents(o.id)[1].actor,'team:test');
 assert.equal(getDb().prepare('SELECT count(*) AS n FROM notification_jobs').get()?.n,1);
 saveDocument('trading',{...settings(),whatsappEnabled:true},'admin');await processNotifications();
 assert.equal(getDb().prepare('SELECT status FROM notification_jobs').get()?.status,'not-configured');
});

test('sandbox hosted checkout is admin-only and reuses its stored redirect',async()=>{
 const o=order();saveDocument('trading',{...settings(),allowTestPayments:true},'admin');
 process.env.YOCO_SECRET_KEY='sk_test_fixture';process.env.FOND_PUBLIC_URL='https://fond.example';
 await assert.rejects(()=>createCheckout(o.reference),/not available/);
 process.env.FOND_ALLOW_TEST_PAYMENTS='true';const original=global.fetch;let calls=0;
 global.fetch=async (_url,init)=>{calls++;const body=JSON.parse(init!.body as string);assert.equal(body.amount,o.totalCents);assert.equal(body.currency,'ZAR');assert.equal(new Headers(init!.headers).get('Idempotency-Key'),o.id);return Response.json({id:'checkout_mock',redirectUrl:'https://c.yoco.com/mock'});};
 try{assert.equal(await createCheckout(o.reference,{allowSandbox:true}),'https://c.yoco.com/mock');assert.equal(await createCheckout(o.reference,{allowSandbox:true}),'https://c.yoco.com/mock');assert.equal(calls,1);assert.throws(()=>recordPayment({orderId:o.id,amountCents:o.totalCents,method:'cash',reference:'counter'},'admin'),/pending/);}finally{global.fetch=original;}
});
test('signed refund notifications cannot refund twice or over-refund',()=>{
 const o=order();process.env.YOCO_SECRET_KEY='sk_live_fixture';
 getDb().prepare('INSERT INTO yoco_checkouts VALUES (?,?,?,?,?)').run(o.id,'ch_refund','https://c.yoco.com/test','pending',new Date().toISOString());
 const payload={id:'pay',status:'succeeded',amount:o.totalCents,currency:'ZAR',mode:'live',metadata:{checkoutId:'ch_refund'}};
 processPaymentEvent({id:'evt_pay',type:'payment.succeeded',payload});
 const refund={id:'evt_refund',type:'refund.succeeded',payload:{...payload,id:'refund'}};processPaymentEvent(refund);processPaymentEvent(refund);
 assert.equal(finance('2020-01-01','2099-01-01').summary.netReceipts,0);
 assert.throws(()=>processPaymentEvent({...refund,id:'another',payload:{...payload,id:'other_refund'}}),/reconciliation/);
});
