import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetDbForTests } from '../src/lib/db';
import { saveDocument } from '../src/lib/management';
import { saveProviderSecret } from '../src/lib/provider-secrets';
import { metaConfigured, sendWhatsAppNotification, twilioConfigured, validateMetaConfig, validateTwilioConfig } from '../src/lib/whatsapp';

process.env.FOND_DB_PATH = ':memory:';
beforeEach(resetDbForTests);
test('Twilio requires sender and approved templates, then sends a ContentSid message', async () => {
  process.env.FOND_CREDENTIALS_KEY = 'f'.repeat(64);
  const previous = globalThis.fetch;
  try {
    assert.equal(twilioConfigured(), false);
    const config = { mode: 'production' as const, accountSid: `AC${'a'.repeat(32)}`, sender: '+27113809400', acceptedContentSid: `HX${'b'.repeat(32)}`, readyContentSid: `HX${'c'.repeat(32)}` };
    assert.throws(() => validateTwilioConfig({ ...config, sender: '0113809400' }));
    saveDocument('twilio-config', config, 'shared-admin');
    assert.equal(twilioConfigured(), false);
    saveProviderSecret('twilio-auth-token', '1'.repeat(32), 'shared-admin');
    assert.equal(twilioConfigured(), true);
    let received: URLSearchParams | null = null;
    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      assert.match(String(url), /api\.twilio\.com\/2010-04-01\/Accounts\/AC/);
      received = options?.body as URLSearchParams;
      return new Response(JSON.stringify({ sid: 'SMtest', status: 'queued' }), { status: 201 });
    }) as typeof fetch;
    const result = await sendWhatsAppNotification({ toE164: '+27821234567', templateName: 'order_ready', customerName: 'Brett', reference: 'FOND-TEST' });
    assert.equal(result.sent, true);
    assert.equal((received as URLSearchParams | null)?.get('ContentSid'), config.readyContentSid);
    assert.equal((received as URLSearchParams | null)?.get('From'), `whatsapp:${config.sender}`);
    assert.deepEqual(JSON.parse((received as URLSearchParams | null)?.get('ContentVariables') ?? '{}'), { '1': 'Brett', '2': 'FOND-TEST' });
  } finally { globalThis.fetch = previous; delete process.env.FOND_CREDENTIALS_KEY; }
});

test('Twilio Sandbox is staging-only and sends FOND order text through the sandbox sender', async () => {
  process.env.FOND_CREDENTIALS_KEY = 'f'.repeat(64);
  process.env.FOND_PUBLIC_URL = 'https://fond-test.mid-point.co.za';
  const previous = globalThis.fetch;
  try {
    const config = { mode: 'sandbox' as const, accountSid: `AC${'a'.repeat(32)}`, sender: '', acceptedContentSid: '', readyContentSid: '' };
    saveDocument('twilio-config', validateTwilioConfig(config), 'shared-admin');
    saveProviderSecret('twilio-auth-token', '1'.repeat(32), 'shared-admin');
    let received: URLSearchParams | null = null;
    globalThis.fetch = (async (_url: string | URL | Request, options?: RequestInit) => {
      received = options?.body as URLSearchParams;
      return new Response('{}', { status: 201 });
    }) as typeof fetch;
    const result = await sendWhatsAppNotification({ toE164: '+27821234567', templateName: 'order_accepted', customerName: 'Brett', reference: 'FOND-TEST' });
    assert.equal(result.sent, true);
    assert.equal((received as URLSearchParams | null)?.get('From'), 'whatsapp:+14155238886');
    assert.match((received as URLSearchParams | null)?.get('Body') ?? '', /FOND-TEST has been accepted/);
    assert.equal((received as URLSearchParams | null)?.has('ContentSid'), false);
    process.env.FOND_PUBLIC_URL = 'https://fond.mid-point.co.za';
    assert.throws(() => validateTwilioConfig(config), /restricted/);
  } finally { globalThis.fetch = previous; delete process.env.FOND_CREDENTIALS_KEY; delete process.env.FOND_PUBLIC_URL; }
});

test('Meta Cloud API is preferred and sends the configured approved template', async()=>{
  process.env.FOND_CREDENTIALS_KEY='f'.repeat(64);
  const previous=globalThis.fetch;
  try{
    const config=validateMetaConfig({phoneNumberId:'123456789012345',wabaId:'1614801770026268',acceptedTemplate:'fond_order_accepted',readyTemplate:'fond_order_ready',languageCode:'en'});
    saveDocument('meta-whatsapp-config',config,'shared-admin');
    saveProviderSecret('meta-access-token','EAA'+'x'.repeat(80),'shared-admin');
    assert.equal(metaConfigured(),true);
    let requestBody:any;
    globalThis.fetch=(async(url:string|URL|Request,options?:RequestInit)=>{
      assert.match(String(url),/graph\.facebook\.com\/v21\.0\/123456789012345\/messages/);
      assert.match(String((options?.headers as Record<string,string>).Authorization),/^Bearer EAA/);
      requestBody=JSON.parse(String(options?.body));
      return Response.json({messages:[{id:'wamid.test'}]});
    }) as typeof fetch;
    const result=await sendWhatsAppNotification({toE164:'+27821234567',templateName:'order_ready',customerName:'Brett',reference:'FOND-TEST'});
    assert.equal(result.sent,true);
    assert.equal(requestBody.template.name,'fond_order_ready');
    assert.deepEqual(requestBody.template.components[0].parameters.map((p:any)=>p.text),['Brett','FOND-TEST']);
  }finally{globalThis.fetch=previous;delete process.env.FOND_CREDENTIALS_KEY;}
});
