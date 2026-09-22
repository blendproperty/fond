import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, resetDbForTests } from '../src/lib/db';
import { signUp, resolveSession } from '../src/lib/auth';
import { saveDocument } from '../src/lib/management';
import { saveProviderSecret } from '../src/lib/provider-secrets';
import { automaticOrderEmailEvent,deliverOrderEmail,requestVerification,sendControlledEmailTest,validEmailSender,verifyEmail } from '../src/lib/email';
import { createOrder } from '../src/lib/orders';

process.env.FOND_DB_PATH = ':memory:';
beforeEach(resetDbForTests);
test('email sender is restricted to the verified FOND subdomain', () => {
  assert.equal(validEmailSender('orders@fond.mid-point.co.za'), true);
  assert.equal(validEmailSender(' Orders@FOND.MID-POINT.CO.ZA '), true);
  assert.equal(validEmailSender('orders@fond.co.za'), false);
  assert.equal(validEmailSender('orders@mid-point.co.za'), false);
});
test('automatic customer email policy sends only received and ready events',()=>{
  assert.equal(automaticOrderEmailEvent('received'),'received');
  assert.equal(automaticOrderEmailEvent('accepted'),null);
  assert.equal(automaticOrderEmailEvent('preparing'),null);
  assert.equal(automaticOrderEmailEvent('ready'),'ready');
  assert.equal(automaticOrderEmailEvent('completed'),null);
  assert.equal(automaticOrderEmailEvent('cancelled'),null);
});
test('controlled email test uses the configured sender without creating an account', async () => {
  process.env.FOND_CREDENTIALS_KEY = 'd'.repeat(64);
  const originalFetch = globalThis.fetch;
  let message: { from: string; to: string[]; subject: string; text: string; html: string } | undefined;
  globalThis.fetch = (async (_url: string | URL | Request, options?: RequestInit) => {
    message = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({ id: 'resend-test' }), { status: 200 });
  }) as typeof fetch;
  try {
    saveProviderSecret('email-api', 're_test_example', 'shared-admin');
    saveDocument('email-from', 'orders@fond.mid-point.co.za', 'shared-admin');
    const result = await sendControlledEmailTest(' ACCOUNT@EXAMPLE.TEST ');
    assert.equal(result.recipient, 'account@example.test');
    assert.equal(result.providerId, 'resend-test');
    assert.deepEqual(message?.to, ['account@example.test']);
    assert.equal(message?.from, 'FOND Midpoint <orders@fond.mid-point.co.za>');
    assert.equal(message?.subject, 'Your FOND email updates are ready');
    assert.match(message?.text ?? '', /transactional email is connected/i);
    assert.match(message?.html ?? '', /Your FOND email updates are ready/);
    assert.match(message?.html ?? '', /Your email details/);
    assert.match(message?.html ?? '', /account@example\.test/);
    assert.match(message?.html ?? '', /Order again from FOND/);
  } finally { globalThis.fetch = originalFetch; delete process.env.FOND_CREDENTIALS_KEY; }
});
test('opted-in guest and verified account orders receive email while opted-out orders do not', async () => {
  process.env.FOND_CREDENTIALS_KEY = 'd'.repeat(64);
  const originalFetch = globalThis.fetch;
  const messages: { from: string; to: string[]; text: string; html: string; subject: string }[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, options?: RequestInit) => {
    messages.push(JSON.parse(String(options?.body)));
    return new Response(JSON.stringify({ id: `resend-${messages.length}` }), { status: 200 });
  }) as typeof fetch;
  try {
    saveProviderSecret('email-api', 're_test_example', 'shared-admin');
    saveDocument('email-from', 'orders@fond.mid-point.co.za', 'shared-admin');
    const guest = createOrder({ customerName: 'Guest', source: 'customer', contactNumber: '0821234567', collectionTime: 'ASAP', lines: [{ id: 'espresso-single', quantity: 1 }], customerEmail: 'guest@example.test', emailOptIn: true });
    assert.equal(await deliverOrderEmail(guest, 'received'), true);
    assert.equal(await deliverOrderEmail(guest, 'received'), true);
    assert.equal(messages.length, 1);
    assert.equal(messages[0].to[0], 'guest@example.test');
    assert.equal(messages[0].subject, `Order received · ${guest.reference}`);
    assert.equal((getDb().prepare('SELECT status FROM email_jobs WHERE id=?').get(`${guest.id}:received`) as { status: string }).status, 'sent');
    const optedOut = createOrder({ customerName: 'No email', source: 'customer', contactNumber: '0821234567', collectionTime: 'ASAP', lines: [{ id: 'espresso-single', quantity: 1 }], customerEmail: 'no-email@example.test', emailOptIn: false });
    assert.equal(await deliverOrderEmail(optedOut, 'received'), false);
    assert.equal((getDb().prepare('SELECT count(*) AS n FROM email_jobs WHERE order_id=?').get(optedOut.id) as { n: number }).n, 0);
    const { token, user } = signUp('account@example.test', 'long-password-123');
    await requestVerification(user);
    assert.equal(messages[1].to[0], user.email);
    assert.equal(messages[1].subject, 'Your FOND verification code');
    assert.match(messages[1].html, /Your verification code/);
    const code = messages[1].text.match(/\b\d{6}\b/)?.[0];
    assert.ok(code);
    assert.throws(() => verifyEmail(user.id, String((Number(code) + 1) % 1000000).padStart(6, '0')));
    verifyEmail(user.id, code);
    assert.equal(resolveSession(token)?.emailVerified, true);
    const order = createOrder({ customerName: 'Account', source: 'customer', contactNumber: '0821234567', collectionTime: 'ASAP', lines: [{ id: 'espresso-single', quantity: 1 }], userId: user.id, customerEmail: user.email, emailOptIn: true });
    assert.equal(await deliverOrderEmail(order, 'received'), true);
    assert.equal(await deliverOrderEmail(order, 'received'), true);
    assert.equal(messages.length, 3);
    assert.equal(messages[2].subject, `Order received · ${order.reference}`);
    assert.match(messages[2].html, /Your order details/);
    assert.match(messages[2].html, /Amount due/);
    assert.match(messages[2].html, /Espresso \(Single\)/);
    assert.match(messages[2].html, /R 32,00/);
    assert.match(messages[2].text, new RegExp(order.reference));
    assert.equal((getDb().prepare('SELECT status FROM email_jobs WHERE id=?').get(`${order.id}:received`) as { status: string }).status, 'sent');
  } finally { globalThis.fetch = originalFetch; delete process.env.FOND_CREDENTIALS_KEY; }
});
