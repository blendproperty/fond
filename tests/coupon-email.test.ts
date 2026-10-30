import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildCouponEmail,COUPON_EMAIL_REASONS} from '../src/lib/coupon-email';
const coupon={code:'COUPON-EXAMPLE123',email:'customer@example.test',reason:'Testing',percent:10,amountCents:0,expiresAt:'2026-11-29T07:04:48.230Z',baseUrl:'https://midpointhub.com'};
test('every coupon reason has a distinct branded design and accurate recipient, offer and South African expiry',()=>{
 const emails=COUPON_EMAIL_REASONS.map(reason=>buildCouponEmail({...coupon,reason}));assert.equal(new Set(emails.map(e=>e.theme)).size,7);assert.equal(new Set(emails.map(e=>e.subject)).size,7);assert.equal(new Set(emails.map(e=>e.html)).size,7);
 for(const email of emails){assert.match(email.html,/midpoint-cafe-powered-by-fond.png/);assert.match(email.html,/<img /);assert.match(email.html,/COUPON-EXAMPLE123/);assert.match(email.html,/customer@example.test/);assert.match(email.html,/29 November 2026/);assert.match(email.html,/09:04 SAST/);assert.match(email.html,/10%/);assert.doesNotMatch(email.html,/R0\.00/);assert.match(email.text,/TEST ONLY/);assert.match(email.html,/role="presentation"/);assert.match(email.html,/href="https:\/\/midpointhub.com\/fond\/menu"/);}
});
test('fixed and combined savings display only the actual offer and preserve the calculation order',()=>{
 const fixed=buildCouponEmail({...coupon,percent:0,amountCents:2000});assert.match(fixed.text,/R20\.00 off/);assert.doesNotMatch(fixed.text,/\b0% off/);
 const combined=buildCouponEmail({...coupon,amountCents:500});assert.match(combined.text,/10% off \+ R5\.00 off/);assert.match(combined.html,/PLUS R5\.00 OFF/);assert.match(combined.html,/Percentage first, then the Rand saving/);assert.match(combined.text,/delivery excluded/);
});
test('custom/internal reasons never leak into customer copy and untrusted coupon fields are escaped',()=>{
 const email=buildCouponEmail({...coupon,reason:'Other: confidential account discussion',code:'<script>alert(1)</script>',email:'<img src=x onerror=alert(1)>@example.test'});assert.equal(email.theme,'personal');assert.doesNotMatch(email.html,/confidential account/);assert.doesNotMatch(email.html,/<script>|<img src=x/);assert.match(email.html,/&lt;script&gt;/);assert.equal(buildCouponEmail({...coupon,reason:'__proto__'}).theme,'personal');assert.equal(buildCouponEmail({...coupon,reason:'constructor'}).theme,'personal');
 assert.equal(buildCouponEmail({...coupon,reason:'5 consecutive paid app purchase days',kind:'coupon-auto'}).theme,'regular');
});
