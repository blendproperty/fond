import {beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {resetDbForTests} from '../src/lib/db';
import {saveDocument} from '../src/lib/management';
import {buildOrderEmail} from '../src/lib/email-template';
import {ACTIVE_EMAIL_MESSAGE_KEYS,DEFAULT_MESSAGE_TEMPLATES,renderMessageText,validateMessageTemplates,type MessageTemplateConfig} from '../src/lib/message-template-config';
import {createOrder} from '../src/lib/orders';
import {smsBody} from '../src/lib/sms';

process.env.FOND_DB_PATH=':memory:';
process.env.FOND_PUBLIC_URL='https://fond-test.mid-point.co.za';
const copy=()=>JSON.parse(JSON.stringify(DEFAULT_MESSAGE_TEMPLATES)) as MessageTemplateConfig;
beforeEach(resetDbForTests);

test('message templates allow known placeholders and reject ambiguous or unsafe content',()=>{
 const valid=validateMessageTemplates(copy());
 assert.equal(renderMessageText(valid.email.templates.received.subject,{reference:'FOND-1'}),'Order received · FOND-1');
 assert.deepEqual(ACTIVE_EMAIL_MESSAGE_KEYS,['received','readyCollection','readyDelivery']);
 const missingReference=copy();missingReference.sms.accepted='Your order is being prepared.';
 assert.throws(()=>validateMessageTemplates(missingReference),/must include \{reference\}/);
 const unknown=copy();unknown.email.templates.received.intro='Hello {firstName}';
 assert.throws(()=>validateMessageTemplates(unknown),/unsupported placeholder/);
 const unsafe=copy();unsafe.email.banner.buttonUrl='javascript:alert(1)';
 assert.throws(()=>validateMessageTemplates(unsafe),/secure https/);
});

test('published templates customise distinct ready email and ready-only upsell without raw HTML',()=>{
 const config=copy();
 config.email.templates.readyDelivery={subject:'Ready to go · {reference}',title:'Lunch is ready for delivery',status:'Driver handoff next',intro:'Hello {customerName}, the kitchen has finished your order.'};
 config.email.banner={enabled:true,imageUrl:'/api/promotion-images/12345678-1234-1234-1234-123456789abc',imageAlt:'Fresh FOND lunch',eyebrow:'THIS WEEK',title:'Lunch, sorted.',body:'Add a coffee when you order again.',buttonLabel:'See the menu',buttonUrl:'/'};
 config.sms.accepted='FOND {reference}: accepted for {customerName}.';
 saveDocument('message-templates-published',validateMessageTemplates(config),'fixture');
 const order=createOrder({customerName:'Brett & Co',source:'customer',contactNumber:'0821234567',collectionTime:'ASAP',lines:[{id:'espresso-single',quantity:1}]});
 const delivery={...order,fulfillment:'delivery' as const,building:'Midpoint',company:'Blend'};
 const ready=buildOrderEmail(delivery,'ready');
 assert.equal(ready.subject,`Ready to go · ${order.reference}`);
 assert.match(ready.html,/ORDER READY/);
 assert.match(ready.html,/Lunch is ready for delivery/);
 assert.match(ready.html,/Driver handoff next/);
 assert.match(ready.html,/Ready for delivery/);
 assert.match(ready.html,/bgcolor="#173f37"/);
 assert.match(ready.html,/Lunch, sorted\./);
 assert.match(ready.html,/https:\/\/fond-test\.mid-point\.co\.za\/api\/promotion-images\/12345678-1234-1234-1234-123456789abc/);
 assert.match(ready.html,/Brett &amp; Co/);
 assert.doesNotMatch(ready.html,/Brett & Co/);
 const received=buildOrderEmail(delivery,'received');
 assert.doesNotMatch(received.html,/ORDER READY/);
 assert.doesNotMatch(received.html,/Lunch, sorted\./);
 assert.doesNotMatch(received.html,/api\/promotion-images/);
 assert.equal(smsBody('order_accepted',order.reference,'collection','Brett'),`FOND ${order.reference}: accepted for Brett.`);
});

test('legacy stored defaults upgrade to the current two-message customer journey',()=>{
 const legacy=copy();delete legacy.version;
 legacy.email.templates.received={subject:'FOND has received {reference}',title:'Order received by FOND Midpoint',status:'Estimated preparation time: {prepMinutes} min',intro:'Thanks, {customerName}. We have received your order and the team will review it shortly.'};
 legacy.email.templates.readyDelivery={subject:'Your FOND order {reference} is ready',title:'Your FOND order is ready',status:'Ready for delivery',intro:'{customerName}, your order is ready and will be delivered shortly.'};
 legacy.email.banner={...legacy.email.banner,eyebrow:'FOND · MIDPOINT HUB',title:'Good food. Everyday.',body:'Fresh breakfast, lunch, coffee and more — ready for collection or delivery.',buttonLabel:'Browse the FOND menu'};
 const upgraded=validateMessageTemplates(legacy);
 assert.equal(upgraded.version,2);
 assert.equal(upgraded.email.templates.received.subject,'Order received · {reference}');
 assert.equal(upgraded.email.templates.readyDelivery.title,'Your FOND order is ready for delivery');
 assert.equal(upgraded.email.banner.buttonLabel,'Order again from FOND');
});
