import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildHubEmail} from '../src/lib/hub-mail';
test('service acknowledgements escape content, omit identity and clarify next steps',()=>{for(const service of ['gym','padel','functions'] as const){const m=buildHubEmail(service,'fixture-id',{firstName:'<script>bad</script>',contactPerson:'<script>bad</script>',identity:'SECRET-ID',phone:'SECRET-PHONE',date:'2026-12-01',pax:'20',cuisine:'Braai',theme:'<img onerror=bad>',budget:'300',budgetBasis:'per-person'});assert.ok(!m.html.includes('<script>'));assert.ok(!m.html.includes('<img onerror'));assert.ok(!JSON.stringify(m).includes('SECRET-'));assert.ok(m.text.includes('Reference: fixture-id'));assert.ok(m.html.includes('max-width:600px'));assert.ok(m.reply_to.endsWith('@midpointhub.com'));if(service==='functions')assert.ok(m.text.includes('not reserved'));if(service==='padel')assert.ok(m.html.includes('https://playtomic.com/clubs/midpoint-padel'));}});


test('Functions staff email includes the complete enquiry and direct reply without a workspace link',()=>{
 const details={contactPerson:'Guest <script>alert(1)</script>',email:'guest@example.com',phone:'0821234567',date:'2026-12-07',pax:'45',cuisine:'Buffet',company:'Example & Co',theme:'Year end <party>',budget:'450.00',budgetBasis:'per-person',identity:'DO-NOT-INCLUDE',consent:true};
 const m=buildHubEmail('functions','request-id',details,true);
 for(const value of [details.contactPerson,details.email,details.phone,details.date,details.pax,details.cuisine,details.company,details.theme,'R 450.00 per person','request-id'])assert.ok(m.text.includes(value),value);
 assert.equal(m.reply_to,details.email);assert.ok(m.html.includes('mailto:guest@example.com'));assert.ok(m.html.includes('Example &amp; Co'));assert.ok(!m.html.includes('<script>'));assert.ok(!m.html.includes('<party>'));assert.ok(!JSON.stringify(m).includes('DO-NOT-INCLUDE'));assert.ok(!JSON.stringify(m).includes('/admin'));assert.ok(!m.text.includes('Open team workspace'));assert.ok(m.text.includes('not a confirmed booking'));
 for(const service of ['gym','padel'] as const){const other=buildHubEmail(service,'id',details,true);assert.ok(!JSON.stringify(other).includes(details.phone));assert.ok(!JSON.stringify(other).includes(details.email));}
 const total=buildHubEmail('functions','id',{...details,budgetBasis:'total'},true);assert.ok(total.text.includes('R 450.00 total'));
 const empty=buildHubEmail('functions','id',{...details,budget:''},true);assert.ok(empty.text.includes('Budget: To discuss'));
});
