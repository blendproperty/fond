import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.FOND_DB_PATH = ':memory:';
let resetDbForTests: () => void;
let signUp: typeof import('../src/lib/auth').signUp;
let recordOrderRequest: typeof import('../src/lib/order-requests').recordOrderRequest;
let listOrderRequests: typeof import('../src/lib/order-requests').listOrderRequests;

before(async () => {
  ({ resetDbForTests } = await import('../src/lib/db'));
  ({ signUp } = await import('../src/lib/auth'));
  ({ recordOrderRequest, listOrderRequests } = await import('../src/lib/order-requests'));
});

beforeEach(() => resetDbForTests());

test('records a durable, still-blocked order request for the signed-in user', () => {
  const { user } = signUp('requester@example.com', 'correct-horse');
  const record = recordOrderRequest(user.id, [{ id: 'green', quantity: 2 }], 'As soon as possible');
  assert.equal(record.status, 'blocked_pending_pos_integration');
  assert.equal(record.totalCents, 10000);
  const [stored] = listOrderRequests(user.id);
  assert.equal(stored.reference, record.reference);
  assert.equal(stored.totalCents, 10000);
});

test('rejects an invalid basket without storing anything', () => {
  const { user } = signUp('invalid@example.com', 'correct-horse');
  assert.throws(() => recordOrderRequest(user.id, [{ id: 'not-a-meal', quantity: 1 }], 'ASAP'));
  assert.equal(listOrderRequests(user.id).length, 0);
});

test('requests are isolated per user', () => {
  const a = signUp('a@example.com', 'correct-horse').user;
  const b = signUp('b@example.com', 'correct-horse').user;
  recordOrderRequest(a.id, [{ id: 'green', quantity: 1 }], 'ASAP');
  assert.equal(listOrderRequests(b.id).length, 0);
  assert.equal(listOrderRequests(a.id).length, 1);
});
