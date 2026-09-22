import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getDb, resetDbForTests } from '../src/lib/db';
import { createOrder, listCustomerOrders, recordPosEntry, updateOrderStatus, getOrderEvents } from '../src/lib/orders';
import { providerSecret, providerSecretStatus, saveProviderSecret } from '../src/lib/provider-secrets';
import { checkStaffCode, isValidStaffToken } from '../src/lib/staff-auth';

process.env.FOND_DB_PATH = ':memory:';
beforeEach(resetDbForTests);
test('a signed-in order is visible only to its own account and POS entry is audited', () => {
  const order = createOrder({ customerName: 'Account customer', collectionTime: 'ASAP', source: 'customer', contactNumber: '0821234567', lines: [{ id: 'espresso-single', quantity: 1 }], userId: 'account-one', customerEmail: 'one@example.test' });
  assert.equal(listCustomerOrders('account-one')[0].id, order.id);
  assert.deepEqual(listCustomerOrders('account-two'), []);
  assert.throws(() => recordPosEntry(order.id, 'POS-1', 'staff'), /Accept/);
  updateOrderStatus(order.id, 'accepted');
  assert.throws(() => updateOrderStatus(order.id, 'ready'), /Yoco/);
  assert.equal(recordPosEntry(order.id, 'POS-1', 'staff').posReference, 'POS-1');
  assert.throws(() => recordPosEntry(order.id, 'POS-2', 'staff'), /already/);
  const second = createOrder({ customerName: 'Second customer', collectionTime: 'ASAP', source: 'staff', contactNumber: '0827654321', lines: [{ id: 'espresso-single', quantity: 1 }] });
  assert.throws(() => recordPosEntry(second.id, ' pos-1 ', 'staff'), new RegExp(`cannot use this Yoco reference.*already been used for order ${order.reference}`));
  assert.equal((getDb().prepare('SELECT pos_reference FROM orders WHERE id=?').get(second.id) as {pos_reference:string|null}).pos_reference, null);
  updateOrderStatus(order.id, 'ready');
  assert.equal(getOrderEvents(order.id).find(event => event.to_status === 'pos-recorded')?.actor, 'staff');
  assert.equal((getDb().prepare('SELECT pos_reference FROM orders WHERE id=?').get(order.id) as { pos_reference: string }).pos_reference, 'POS-1');
});
test('provider keys are encrypted, write only, and fail closed with the wrong vault key', () => {
  process.env.FOND_CREDENTIALS_KEY = 'a'.repeat(64);
  try {
    saveProviderSecret('yoco-secret', 'sk_test_example', 'shared-admin');
    assert.equal(providerSecretStatus('yoco-secret'), true);
    assert.equal(providerSecret('yoco-secret'), 'sk_test_example');
    const row = getDb().prepare('SELECT ciphertext FROM provider_secrets WHERE name=?').get('yoco-secret') as { ciphertext: Uint8Array };
    assert.equal(Buffer.from(row.ciphertext).includes(Buffer.from('sk_test_example')), false);
    process.env.FOND_CREDENTIALS_KEY = 'b'.repeat(64);
    assert.throws(() => providerSecret('yoco-secret'));
  } finally { delete process.env.FOND_CREDENTIALS_KEY; }
});
test('rotating the shared staff code in Settings revokes the previous tablet token', () => {
  process.env.FOND_CREDENTIALS_KEY = 'e'.repeat(64);
  process.env.FOND_STAFF_CODE = 'old-code';
  try {
    const previous = checkStaffCode('old-code');
    assert.ok(isValidStaffToken(previous));
    saveProviderSecret('staff-shared-code', 'new-code-123', 'shared-admin');
    assert.equal(checkStaffCode('old-code'), null);
    assert.equal(isValidStaffToken(previous), false);
    assert.ok(isValidStaffToken(checkStaffCode('new-code-123')));
  } finally { delete process.env.FOND_CREDENTIALS_KEY; delete process.env.FOND_STAFF_CODE; }
});
