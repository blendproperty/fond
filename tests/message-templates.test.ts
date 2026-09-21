import {beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {resetDbForTests} from '../src/lib/db';
import {saveDocument} from '../src/lib/management';
import {buildOrderEmail} from '../src/lib/email-template';
import {DEFAULT_MESSAGE_TEMPLATES,renderMessageText,validateMessageTemplates,type MessageTemplateConfig} from '../src/lib/message-template-config';
import {createOrder} from '../src/lib/orders';
import {smsBody} from '../src/lib/sms';

process.env.FOND_DB_PATH=':memory:';
process.env.FOND_PUBLIC_URL='https://fond-test.mid-point.co.za';
const copy=()=>JSON.parse(JSON.stringify(DEFAULT_MESSAGE_TEMPLATES)) as MessageTemplateConfig;
beforeEach(resetDbForTests);

test('message templates allow known placeholders and reject ambiguous or unsafe content',()=>{
 const valid=validateMessageTemplates(copy());
 assert.equal(renderMessageText(valid.email.templates.received.subject,{reference:'FOND-1'}),'FOND has received FOND-1');
 const missingReference=copy();missingReference.sms.accepted='Your order is being prepared.';
 assert.throws(()=>validateMessageTemplates(missingReference),/must include \{reference\}/);
 const unknown=copy();unknown.email.templates.received.intro='Hello {firstName}';
 assert.throws(()=>validateMessageTemplates(unknown),/unsupported placeholder/);
 const unsafe=copy();unsafe.email.banner.buttonUrl='javascript:alert(1)';
 assert.throws(()=>validateMessageTemplates(unsafe),/secure https/);
});

test('published templates customise order email, banner image and SMS without raw HTML',()=>{
 const config=copy();
 config.email.templates.accepted={subject:'Accepted · {reference}',title:'Lunch is confirmed',status:'About {prepMinutes} minutes',intro:'Hello {customerName}, the kitchen has your order.'};
 config.email.banner={enabled:true,imageUrl:'/api/promotion-images/12345678-1234-1234-1234-123456789abc',imageAlt:'Fresh FOND lunch',eyebrow:'THIS WEEK',title:'Lunch, sorted.',body:'Add a coffee when you order again.',buttonLabel:'See the menu',buttonUrl:'/'};
 config.sms.accepted='FOND {reference}: accepted for {customerName}.';
 saveDocument('message-templates-published',validateMessageTemplates(config),'fixture');
 const order=createOrder({customerName:'Brett & Co',source:'customer',contactNumber:'0821234567',collectionTime:'ASAP',lines:[{id:'espresso-single',quantity:1}]});
 const email=buildOrderEmail(order,'accepted');
 assert.equal(email.subject,`Accepted · ${order.reference}`);
 assert.match(email.html,/Lunch is confirmed/);
 assert.match(email.html,/Lunch, sorted\./);
 assert.match(email.html,/https:\/\/fond-test\.mid-point\.co\.za\/api\/promotion-images\/12345678-1234-1234-1234-123456789abc/);
 assert.match(email.html,/Brett &amp; Co/);
 assert.doesNotMatch(email.html,/Brett & Co/);
 assert.equal(smsBody('order_accepted',order.reference,'collection','Brett'),`FOND ${order.reference}: accepted for Brett.`);
});
