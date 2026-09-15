import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, resetDbForTests } from '../src/lib/db';
import { signUp, resolveSession } from '../src/lib/auth';
import { saveDocument } from '../src/lib/management';
import { saveProviderSecret } from '../src/lib/provider-secrets';
import { deliverOrderEmail, requestVerification, verifyEmail } from '../src/lib/email';
import { createOrder } from '../src/lib/orders';

process.env.FOND_DB_PATH = ':memory:';
beforeEach(resetDbForTests);
test('verified accounts get one receipt per order while unverified accounts get none', async () => {
  process.env.FOND_CREDENTIALS_KEY = 'd'.repeat(64);
  const originalFetch = globalThis.fetch;
  const messages: { to: string[]; text: string; subject: string }[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, options?: RequestInit) => {
    messages.push(JSON.parse(String(options?.body)));
    return new Response(JSON.stringify({ id: `resend-${messages.length}` }), { status: 200 });
  }) as typeof fetch;
  try {
    saveProviderSecret('email-api', 're_test_example', 'shared-admin');
    saveDocument('email-from', 'orders@fond.co.za', 'shared-admin');
    const { token, user } = signUp('account@example.test', 'long-password-123');
    const order = createOrder({ customerName: 'Account', source: 'customer', collectionTime: 'ASAP', lines: [{ id: 'espresso-single', quantity: 1 }], userId: user.id, customerEmail: user.email });
    assert.equal(await deliverOrderEmail(order, 'received'), false);
    assert.equal(messages.length, 0);
    await requestVerification(user);
    assert.equal(messages[0].to[0], user.email);
    const code = messages[0].text.match(/\b\d{6}\b/)?.[0];
    assert.ok(code);
    assert.throws(() => verifyEmail(user.id, String((Number(code) + 1) % 1000000).padStart(6, '0')));
    verifyEmail(user.id, code);
    assert.equal(resolveSession(token)?.emailVerified, true);
    assert.equal(await deliverOrderEmail(order, 'received'), true);
    assert.equal(await deliverOrderEmail(order, 'received'), true);
    assert.equal(messages.length, 2);
    assert.equal((getDb().prepare('SELECT status FROM email_jobs WHERE id=?').get(`${order.id}:received`) as { status: string }).status, 'sent');
  } finally { globalThis.fetch = originalFetch; delete process.env.FOND_CREDENTIALS_KEY; }
});
