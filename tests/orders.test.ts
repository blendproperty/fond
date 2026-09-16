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
let getDb: typeof import('../src/lib/db').getDb;

before(async () => {
  ({ resetDbForTests, getDb } = await import('../src/lib/db'));
  ({ createOrder, getOrderByReference, listActiveOrders, updateOrderStatus, recordPosEntry, OrderTransitionError, searchOrders } = await import('../src/lib/orders'));
});

beforeEach(() => resetDbForTests());

const lines = [{ id: 'espresso-single', quantity: 2 }];

test('customer orders start at received; staff orders start at accepted', () => {
  const customer = createOrder({ customerName: 'Jane', lines, collectionTime: 'ASAP', source: 'customer', contactNumber: '0821234567' });
  assert.equal(customer.status, 'received');
  assert.equal(customer.estimatedPrepMinutes, 4);
  assert.equal(customer.lines[0].prepMinutes, 3);
  assert.match(customer.reference, /^FOND-/);
  assert.throws(() => createOrder({ customerName: 'Table 5', lines, collectionTime: 'ASAP', source: 'staff' }), /contact number/);
  const staff = createOrder({ customerName: 'Table 4', lines, collectionTime: 'ASAP', source: 'staff', contactNumber: '0821234567' });
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

test('basket estimate uses the slowest item plus the editable uncertainty buffer', async () => {
  const {saveDocument,settings}=await import('../src/lib/management');
  saveDocument('trading',{...settings(),preparationWeightPercent:8},'fixture');
  const mixed=createOrder({customerName:'Jane',lines:[{id:'espresso-single',quantity:1},{id:'rump-350',quantity:1}],collectionTime:'ASAP',source:'customer',contactNumber:'0821234567'});
  assert.equal(mixed.estimatedPrepMinutes,22);
});

test('staff can track Yoco entry, preparation and fulfilment without losing the active order', () => {
  const order = createOrder({customerName:'Jane',lines,collectionTime:'ASAP',source:'customer',contactNumber:'0821234567'});
  updateOrderStatus(order.id,'accepted');
  recordPosEntry(order.id,'YOCO-TEST','fixture');
  assert.equal(updateOrderStatus(order.id,'preparing').status,'preparing');
  assert.equal(listActiveOrders()[0].status,'preparing');
  assert.equal(updateOrderStatus(order.id,'ready').status,'ready');
  assert.equal(updateOrderStatus(order.id,'completed').status,'completed');
});

test('pending Yoco checkout cannot be accepted before signed payment is recorded', () => {
  const order=createOrder({customerName:'Jane',lines,collectionTime:'ASAP',source:'customer',contactNumber:'0821234567'});
  getDb().prepare("INSERT INTO yoco_checkouts (order_id,checkout_id,redirect_url,status,updated_at) VALUES (?,NULL,NULL,'pending',?)").run(order.id,new Date().toISOString());
  assert.throws(()=>updateOrderStatus(order.id,'accepted'),/Await signed Yoco payment confirmation/);
  assert.equal(getOrderByReference(order.reference)?.status,'received');
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
