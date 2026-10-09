import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetDbForTests } from '../src/lib/db';
import { saveDocument } from '../src/lib/management';
import { providerSecret, saveProviderSecret } from '../src/lib/provider-secrets';
import { sendWhatChimpOrder, sendWhatChimpSessionTest, validateWhatChimpConfig, whatChimpConfigured, whatChimpDeliveryStatus } from '../src/lib/whatchimp';
import { sendWhatsAppNotification } from '../src/lib/whatsapp';

process.env.FOND_DB_PATH = ':memory:';
const originalFetch = globalThis.fetch;
const config = { enabled: true, phoneNumberId: '123456789012345', acceptedTemplateId: '456012', readyTemplateId: '456014', nameParameter: '', referenceParameter: 'templateVariable-order_reference-2' };
beforeEach(() => {
  resetDbForTests(); process.env.FOND_CREDENTIALS_KEY = 'f'.repeat(64); process.env.FOND_PUBLIC_URL = 'https://fond-test.mid-point.co.za';
  saveDocument('whatchimp-config', validateWhatChimpConfig(config), 'test'); saveProviderSecret('whatchimp-api-token', '12345|' + 'x'.repeat(40), 'test');
});
afterEach(() => { globalThis.fetch = originalFetch; delete process.env.FOND_CREDENTIALS_KEY; delete process.env.FOND_PUBLIC_URL; });
test('WhatChimp trial remains blocked on production and requires complete template mappings', async () => {
  assert.equal(whatChimpConfigured(), true);
  assert.throws(() => validateWhatChimpConfig({ ...config, referenceParameter: '' }), /both approved templates/);
  assert.throws(() => validateWhatChimpConfig({ ...config, nameParameter: 'apiToken' }), /exact variable/);
  process.env.FOND_PUBLIC_URL = 'https://midpointhub.com';
  globalThis.fetch = (async () => { throw new Error('must not send'); }) as typeof fetch;
  assert.equal(whatChimpConfigured(), false);
  assert.deepEqual(await sendWhatChimpOrder({ toE164: '+27821234567', templateName: 'order_ready', customerName: 'Tester', reference: 'TEST' }), { sent: false, reason: 'NOT_CONFIGURED' });
});
test('WhatChimp sends form-encoded template parameters and never places secrets in the URL', async () => {
  globalThis.fetch = (async (url, options) => {
    assert.equal(String(url), 'https://app.whatchimp.com/api/v1/whatsapp/send/template');
    assert.equal(options?.redirect, 'error');
    const body = options?.body as URLSearchParams;
    assert.equal(body.get('apiToken'), providerSecret('whatchimp-api-token'));
    assert.equal(body.get('phone_number'), '27821234567'); assert.equal(body.get('template_id'), '456014');
    assert.equal(body.has(''), false); assert.equal(body.has('templateVariable-Name-1'), false); assert.equal(body.get(config.referenceParameter), 'FOND-TEST');
    return Response.json({ status: '1', wa_message_id: 'wamid.test' });
  }) as typeof fetch;
  assert.deepEqual(await sendWhatsAppNotification({ toE164: '+27821234567', templateName: 'order_ready', customerName: 'Tester', reference: 'FOND-TEST' }), { sent: true, providerId: 'wamid.test' });
});
test('Session test does not enable automated notifications and requires explicit provider acceptance', async () => {
  saveDocument('whatchimp-config', { ...config, enabled: false }, 'test');
  globalThis.fetch = (async (url, options) => {
    assert.equal(String(url), 'https://app.whatchimp.com/api/v1/whatsapp/send');
    assert.match((options?.body as URLSearchParams).get('message') ?? '', /connection test/);
    return Response.json({ status: '0', message: 'Rejected secret data must not be returned' });
  }) as typeof fetch;
  assert.deepEqual(await sendWhatChimpSessionTest('+27821234567'), { sent: false, reason: 'WHATCHIMP_REJECTED' });
  assert.deepEqual(await sendWhatChimpOrder({ toE164: '+27821234567', templateName: 'order_ready', customerName: 'Tester', reference: 'TEST' }), { sent: false, reason: 'NOT_CONFIGURED' });
  globalThis.fetch = (async () => Response.json({ status: '1' })) as typeof fetch;
  assert.deepEqual(await sendWhatChimpSessionTest('+27821234567'), { sent: false, reason: 'NETWORK_ERROR' });
});
test('Delivery lookup reads the documented status and filters provider data', async () => {
  globalThis.fetch = (async (_url, options) => {
    assert.equal((options?.body as URLSearchParams).get('wa_message_id'), 'wamid.test');
    return Response.json({ status: '1', message: { message_status: 'delivered', phone_number: 'private', failed_reason: 'private' } });
  }) as typeof fetch;
  assert.deepEqual(await whatChimpDeliveryStatus('wamid.test'), { ok: true, status: 'delivered' });
  await assert.rejects(() => whatChimpDeliveryStatus('bad-id'), /valid WhatsApp message ID/);
});
test('Controlled template testing works without switching the existing order provider', async () => {
  saveDocument('whatchimp-config', { ...config, enabled: false }, 'test');
  globalThis.fetch = (async () => Response.json({ status: '1', wa_message_id: 'wamid.test' })) as typeof fetch;
  const notification = { toE164: '+27821234567', templateName: 'order_ready' as const, customerName: 'Tester', reference: 'TEST' };
  assert.deepEqual(await sendWhatChimpOrder(notification), { sent: false, reason: 'NOT_CONFIGURED' });
  assert.deepEqual(await sendWhatChimpOrder(notification, true), { sent: true, providerId: 'wamid.test' });
});
