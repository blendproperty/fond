import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.FOND_DB_PATH = ':memory:';
let resetDbForTests: () => void;
let createOrder: typeof import('../src/lib/orders').createOrder;
let getOrderByReference: typeof import('../src/lib/orders').getOrderByReference;
let listActiveOrders: typeof import('../src/lib/orders').listActiveOrders;
let updateOrderStatus: typeof import('../src/lib/orders').updateOrderStatus;
let recordPosEntry: typeof import('../src/lib/orders').recordPosEntry;
let OrderTransitionError: typeof import('../src/lib/orders').OrderTransitionError;
let searchOrders: typeof import('../src/lib/orders').searchOrders;

before(async () => {
  ({ resetDbForTests } = await import('../src/lib/db'));
  ({ createOrder, getOrderByReference, listActiveOrders, updateOrderStatus, recordPosEntry, OrderTransitionError, searchOrders } = await import('../src/lib/orders'));
});

beforeEach(() => resetDbForTests());

const lines = [{ id: 'espresso-single', quantity: 2 }];

test('customer orders start at received; staff orders start at accepted', () => {
  const customer = createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', contactNumber: '0821234567' });
  assert.equal(customer.status, 'received');
  assert.match(customer.reference, /^FOND-/);
  const staff = createOrder({ customerName: 'Table 4', lines, collectionTime: 'ASAP', source: 'staff' });
  assert.equal(staff.status, 'accepted');
});

test('rejects missing name, collection time or an empty/invalid basket', () => {
  assert.throws(() => createOrder({ customerName: '', lines, collectionTime: 'ASAP', source: 'customer' }));
  assert.throws(() => createOrder({ customerName: 'Jane', lines, collectionTime: '', source: 'customer' }));
  assert.throws(() => createOrder({ customerName: 'Jane', lines: [], collectionTime: 'ASAP', source: 'customer' }));
  assert.throws(() => createOrder({ customerName: 'Jane', lines: [{ id: 'missing', quantity: 1 }], collectionTime: 'ASAP', source: 'customer' }));
});

test('an order can be looked up by reference and only active orders are listed', () => {
  const order = createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', contactNumber: '0821234567' });
  assert.equal(getOrderByReference(order.reference)?.id, order.id);
  assert.equal(getOrderByReference('FOND-NOPE'), null);
  assert.equal(listActiveOrders().length, 1);
  updateOrderStatus(order.id, 'accepted');
  recordPosEntry(order.id, 'YOCO-TEST', 'fixture');
  updateOrderStatus(order.id, 'ready');
  updateOrderStatus(order.id, 'completed');
  assert.equal(listActiveOrders().length, 0);
});

test('valid transitions succeed and invalid ones are rejected', () => {
  const order = createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', contactNumber: '0821234567' });
  assert.equal(updateOrderStatus(order.id, 'accepted').status, 'accepted');
  assert.throws(() => updateOrderStatus(order.id, 'completed'), OrderTransitionError);
  assert.throws(() => updateOrderStatus(order.id, 'ready'), /Record the Yoco order entry/);
  recordPosEntry(order.id, 'YOCO-TEST', 'fixture');
  updateOrderStatus(order.id, 'ready');
  updateOrderStatus(order.id, 'completed');
  assert.throws(() => updateOrderStatus(order.id, 'ready'), OrderTransitionError);
  assert.throws(() => updateOrderStatus('not-a-real-id', 'accepted'), OrderTransitionError);
});

test('defaults to collection, and delivery requires a contact number and building', () => {
  const collection = createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', contactNumber: '0821234567' });
  assert.equal(collection.fulfillment, 'collection');
  assert.throws(() => createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', fulfillment: 'delivery' }));
  assert.throws(() => createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', fulfillment: 'delivery', contactNumber: '0821234567' }));
  const delivery = createOrder({
    customerName: 'Jane',
    lines,
    collectionTime: 'ASAP',
    source: 'customer',
    fulfillment: 'delivery',
    contactNumber: '0821234567',
    company: 'Blend Property',
    building: 'OnPoint 2nd floor',
    whatsappOptIn: true,
  });
  assert.equal(delivery.fulfillment, 'delivery');
  assert.equal(delivery.building, 'OnPoint 2nd floor');
  assert.equal(delivery.whatsappOptIn, true);
});

test('collection requires a valid contact number', () => {
  assert.throws(() => createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer' }), /contact number/);
  assert.throws(() => createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', contactNumber: 'abc123' }), /valid contact number/);
  const order = createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', contactNumber: '0821234567', whatsappOptIn: true });
  assert.equal(order.whatsappOptIn, true);
});

test('orders can be searched by status, fulfillment and free text', () => {
  createOrder({ customerName: 'Alice', lines, collectionTime: 'ASAP', source: 'customer', contactNumber: '0821234567' });
  createOrder({ customerName: 'Bob', lines, collectionTime: 'ASAP', source: 'customer', fulfillment: 'delivery', contactNumber: '0821234567', building: 'OnPoint' });
  assert.equal(searchOrders({ fulfillment: 'delivery' }).length, 1);
  assert.equal(searchOrders({ query: 'Alice' }).length, 1);
  assert.equal(searchOrders({}).length, 2);
});
