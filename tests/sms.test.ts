import {beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {getDb,resetDbForTests} from '../src/lib/db';
import {DEFAULT_SETTINGS,saveDocument} from '../src/lib/management';
import {saveProviderSecret} from '../src/lib/provider-secrets';
import {createOrder,updateOrderStatus} from '../src/lib/orders';
import {processNotifications} from '../src/lib/notifications';
import {sendSmsNotification,smsBody,smsConfigured,validateSmsConfig,verifyTwilioSignature} from '../src/lib/sms';

process.env.FOND_DB_PATH=':memory:';
process.env.FOND_PUBLIC_URL='https://fond-test.mid-point.co.za';
beforeEach(()=>{resetDbForTests();process.env.FOND_CREDENTIALS_KEY='f'.repeat(64);});

test('SMS validates the FOND sender and sends concise Twilio messages with a delivery callback',async()=>{
 const config={accountSid:`AC${'a'.repeat(32)}`,sender:'+27600928520'};
 assert.throws(()=>validateSmsConfig({...config,sender:'0600928520'}),/international format/);
 saveDocument('twilio-sms-config',config,'fixture');
 assert.equal(smsConfigured(),false);
 saveProviderSecret('twilio-auth-token','1'.repeat(32),'fixture');
 assert.equal(smsConfigured(),true);
 const previous=global.fetch;let received:URLSearchParams|null=null;
 global.fetch=(async(url:string|URL|Request,init?:RequestInit)=>{assert.match(String(url),/api\.twilio\.com/);received=init?.body as URLSearchParams;return Response.json({sid:'SM123',status:'queued'},{status:201});}) as typeof fetch;
 try{
  const result=await sendSmsNotification({toE164:'+27821234567',templateName:'order_accepted',reference:'FOND-TEST'});
  assert.equal(result.sent,true);assert.equal(result.providerId,'SM123');assert.equal(result.providerStatus,'queued');
  assert.equal((received as URLSearchParams|null)?.get('From'),config.sender);
  assert.equal((received as URLSearchParams|null)?.get('To'),'+27821234567');
  assert.equal((received as URLSearchParams|null)?.get('StatusCallback'),'https://fond-test.mid-point.co.za/api/webhooks/twilio/sms');
  assert.equal((received as URLSearchParams|null)?.get('Body'),smsBody('order_accepted','FOND-TEST'));
  assert.match(smsBody('order_ready','FOND-TEST','delivery'),/delivered shortly/);
 }finally{global.fetch=previous;}
});

test('SMS order opt-in creates durable accepted and ready jobs without affecting WhatsApp',async()=>{
 const order=createOrder({submissionKey:randomUUID(),customerName:'SMS customer',lines:[{id:'espresso-single',quantity:1}],collectionTime:'ASAP',source:'customer',contactNumber:'0821234567',smsOptIn:true});
 assert.equal(order.smsOptIn,true);assert.equal(order.whatsappOptIn,false);
 updateOrderStatus(order.id,'accepted','received');
 assert.equal((getDb().prepare('SELECT count(*) AS n FROM sms_jobs').get() as {n:number}).n,1);
 assert.equal((getDb().prepare('SELECT count(*) AS n FROM notification_jobs').get() as {n:number}).n,0);
 saveDocument('trading',{...DEFAULT_SETTINGS,smsEnabled:true},'fixture');
 await processNotifications();
 assert.equal((getDb().prepare('SELECT status FROM sms_jobs').get() as {status:string}).status,'not-configured');
});

test('Twilio callback signatures are checked against the exact public callback URL',()=>{
 saveProviderSecret('twilio-auth-token','2'.repeat(32),'fixture');
 const url='https://fond-test.mid-point.co.za/api/webhooks/twilio/sms',params=new URLSearchParams({MessageStatus:'delivered',MessageSid:'SM123'});
 const value=url+[...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+v).join('');
 const signature=createHmac('sha1','2'.repeat(32)).update(value).digest('base64');
 assert.equal(verifyTwilioSignature(url,params,signature),true);
 assert.equal(verifyTwilioSignature(url,params,signature+'x'),false);
});
