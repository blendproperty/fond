import {beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {resetDbForTests} from '../src/lib/db';
import {GET,POST} from '../src/app/api/webhooks/whatsapp/route';

process.env.FOND_DB_PATH=':memory:';
beforeEach(()=>{resetDbForTests();process.env.FOND_WHATSAPP_VERIFY_TOKEN='fond-test-verification-token';process.env.FOND_WHATSAPP_APP_SECRET='a'.repeat(32);});

test('Meta verifies the callback only with the matching token',async()=>{
 const ok=await GET(new Request('https://fond-test.mid-point.co.za/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=fond-test-verification-token&hub.challenge=12345'));
 assert.equal(ok.status,200);assert.equal(await ok.text(),'12345');
 const denied=await GET(new Request('https://fond-test.mid-point.co.za/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345'));
 assert.equal(denied.status,403);
});

test('Meta webhook rejects unsigned payloads and accepts a valid signature',async()=>{
 const body=JSON.stringify({object:'whatsapp_business_account',entry:[]});
 const signature='sha256='+createHmac('sha256','a'.repeat(32)).update(body).digest('hex');
 const denied=await POST(new Request('https://fond-test.mid-point.co.za/api/webhooks/whatsapp',{method:'POST',body}));
 assert.equal(denied.status,401);
 const ok=await POST(new Request('https://fond-test.mid-point.co.za/api/webhooks/whatsapp',{method:'POST',headers:{'x-hub-signature-256':signature},body}));
 assert.equal(ok.status,200);
});
