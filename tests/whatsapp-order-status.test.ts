import { afterEach, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, resetDbForTests } from '../src/lib/db';
import { createOrder } from '../src/lib/orders';
import { saveProviderSecret } from '../src/lib/provider-secrets';
import { allowOrderStatusLookup, lookupWhatsAppOrderStatus } from '../src/lib/whatsapp-order-status';
import { POST } from '../src/app/api/whatsapp/order-status/route';

process.env.FOND_DB_PATH = ':memory:';
const token = 'a'.repeat(64);
beforeEach(() => {
  resetDbForTests(); process.env.FOND_PUBLIC_URL = 'https://midpointhub.com'; process.env.FOND_CREDENTIALS_KEY = 'f'.repeat(64);
  saveProviderSecret('whatchimp-order-status-token', token, 'test');
});
afterEach(() => { delete process.env.FOND_PUBLIC_URL; delete process.env.FOND_CREDENTIALS_KEY; });
const request = (body: unknown, auth = `Bearer ${token}`) => new Request('https://midpointhub.com/api/whatsapp/order-status', {
  method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body),
});
function order() { return createOrder({ customerName: 'Private name', lines: [{ id: 'espresso-single', quantity: 1 }], collectionTime: 'ASAP', source: 'staff', contactNumber: '0821234567', note: 'Private note' }); }

test('requires a dedicated encrypted token and rejects unrelated hosts or messaging credentials', async () => {
  for (const auth of ['', 'Bearer wrong', `Bearer ${'b'.repeat(64)}`]) assert.equal((await POST(request({}, auth))).status, 401);
  process.env.FOND_PUBLIC_URL = 'https://unapproved.example';
  assert.equal((await POST(request({}))).status, 401);
  assert.throws(() => saveProviderSecret('whatchimp-order-status-token', 'not-random', 'test'));
});
test('matches subscriber international phone to checkout phone and exposes only fresh status text', async () => {
  const item = order();
  const response = await POST(request({ reference: item.displayReference.toLowerCase(), phone: '27821234567' }));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json(); assert.deepEqual(Object.keys(result), ['message']);
  assert.match(result.message, /Accepted/); assert.match(result.message, /SAST/);
  for (const privateValue of ['Private name', 'Private note', '0821234567', item.id, item.reference]) assert.equal(result.message.includes(privateValue), false);
  getDb().prepare("UPDATE orders SET status='preparing' WHERE id=?").run(item.id);
  assert.match((await (await POST(request({ reference: item.displayReference, phone: '+27 82 123 4567' }))).json()).message, /Preparing/);
});
test('unknown orders, absent phones and mismatched owners receive the same non-disclosing answer', () => {
  const item = order();
  const wrong = lookupWhatsAppOrderStatus({ reference: item.displayReference, phone: '27829999999' });
  assert.deepEqual(wrong, lookupWhatsAppOrderStatus({ reference: 'FOND-ZZZZ-ZZZZ', phone: '27829999999' }));
  getDb().prepare('UPDATE orders SET contact_number=NULL WHERE id=?').run(item.id);
  assert.deepEqual(wrong, lookupWhatsAppOrderStatus({ reference: item.displayReference, phone: '27821234567' }));
});
test('handles every order state and distinguishes collection from delivery readiness', () => {
  const item = order();
  for (const status of ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled']) {
    getDb().prepare('UPDATE orders SET status=? WHERE id=?').run(status, item.id);
    const result = lookupWhatsAppOrderStatus({ reference: item.displayReference, phone: '27821234567' });
    assert.ok(result.message.includes(item.displayReference));
    if (status === 'ready') assert.match(result.message, /collection/);
  }
  getDb().prepare("UPDATE orders SET status='ready',fulfillment='delivery' WHERE id=?").run(item.id);
  assert.match(lookupWhatsAppOrderStatus({ reference: item.displayReference, phone: '27821234567' }).message, /awaiting delivery/);
});
test('bounds request size, handles malformed inputs, and accepts WhatChimp form transport', async () => {
  assert.equal((await POST(request({ reference: 'x'.repeat(5000) }))).status, 413);
  assert.match((await (await POST(request([]))).json()).message, /full FOND order number/);
  assert.match(lookupWhatsAppOrderStatus({ reference: 'junk', phone: '27821234567' }).message, /FOND-XXXX-XXXX/);
  const item = order();
  const result = await POST(new Request('https://midpointhub.com/api/whatsapp/order-status', {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ reference: item.displayReference, phone: '27821234567' }),
  }));
  assert.match((await result.json()).message, /Accepted/);
});
test('persistent rate limit resets its window and stores no raw phone', () => {
  const start = 60000;
  for (let i = 0; i < 12; i++) assert.equal(allowOrderStatusLookup('27821234567', 12, start), true);
  assert.equal(allowOrderStatusLookup('27821234567', 12, start), false);
  assert.equal(allowOrderStatusLookup('27821234567', 12, start + 60000), true);
  const rows = getDb().prepare('SELECT key FROM whatsapp_lookup_limits').all();
  assert.equal(JSON.stringify(rows).includes('27821234567'), false);
});


test('dine-in WhatsApp status uses table service and served wording',()=>{
 const item=order();
 getDb().prepare("UPDATE orders SET status='ready',fulfillment='dine_in' WHERE id=?").run(item.id);
 assert.match(lookupWhatsAppOrderStatus({reference:item.displayReference,phone:'27821234567'}).message,/table service/);
 getDb().prepare("UPDATE orders SET status='completed' WHERE id=?").run(item.id);
 assert.match(lookupWhatsAppOrderStatus({reference:item.displayReference,phone:'27821234567'}).message,/marked served/);
});
