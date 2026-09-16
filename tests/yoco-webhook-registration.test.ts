import {afterEach,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {resetDbForTests} from '../src/lib/db';
import {providerSecret,saveProviderSecret} from '../src/lib/provider-secrets';
import {registerYocoWebhook} from '../src/lib/payments';

process.env.FOND_DB_PATH=':memory:';
const originalFetch=globalThis.fetch;
beforeEach(()=>{
  resetDbForTests();
  process.env.FOND_CREDENTIALS_KEY='7'.repeat(64);
  process.env.FOND_PUBLIC_URL='https://fond-test.mid-point.co.za';
});
afterEach(()=>{
  globalThis.fetch=originalFetch;
  delete process.env.FOND_CREDENTIALS_KEY;
  delete process.env.FOND_PUBLIC_URL;
});

test('registers the Checkout webhook server-side and stores its one-time secret',async()=>{
  saveProviderSecret('yoco-secret','sk_test_example','test');
  let authorization='',requestBody:unknown;
  globalThis.fetch=async(input,init)=>{
    assert.equal(input,'https://payments.yoco.com/api/webhooks');
    authorization=new Headers(init?.headers).get('authorization')??'';
    requestBody=JSON.parse(String(init?.body));
    return Response.json({id:'sub_example',mode:'test',name:'FOND Midpoint Sandbox',secret:'whsec_c2lnbmluZy1zZWNyZXQ=',url:'https://fond-test.mid-point.co.za/api/payments/webhook'},{status:201});
  };
  const result=await registerYocoWebhook('super:test');
  assert.equal(authorization,'Bearer sk_test_example');
  assert.deepEqual(requestBody,{name:'FOND Midpoint Sandbox',url:'https://fond-test.mid-point.co.za/api/payments/webhook'});
  assert.deepEqual(result,{id:'sub_example',mode:'test',url:'https://fond-test.mid-point.co.za/api/payments/webhook'});
  assert.equal(providerSecret('yoco-webhook'),'whsec_c2lnbmluZy1zZWNyZXQ=');
});

test('does not store malformed webhook registration responses',async()=>{
  saveProviderSecret('yoco-secret','sk_test_example','test');
  globalThis.fetch=async()=>Response.json({id:'sub_example',mode:'test',secret:'not-a-signing-secret',url:'https://fond-test.mid-point.co.za/api/payments/webhook'},{status:201});
  await assert.rejects(registerYocoWebhook('super:test'),/invalid webhook registration/i);
  assert.equal(providerSecret('yoco-webhook'),null);
});
