import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getDb, resetDbForTests } from '../src/lib/db';
import { createOrder, getOrderByReference, getOrderEvents, updateOrderStatus, SubmissionConflictError } from '../src/lib/orders';
import { updateMenuItem, deleteMenuItem } from '../src/lib/menu-store';
process.env.FOND_DB_PATH = ':memory:';
beforeEach(resetDbForTests);
const input = () => ({submissionKey:randomUUID(),customerName:'Test',lines:[{id:'espresso-single',quantity:2}],collectionTime:'ASAP',source:'customer' as const});
test('retry returns the same order even after the menu changes',()=>{
 const request=input();const order=createOrder(request);
 updateMenuItem('espresso-single',{price:5000});
 assert.equal(createOrder(request).id,order.id);
 assert.equal(getDb().prepare('SELECT count(*) AS n FROM orders').get()?.n,1);
 assert.equal(getOrderEvents(order.id).length,1);
 assert.throws(()=>createOrder({...request,customerName:'Changed'}),SubmissionConflictError);
});
test('snapshots survive menu deletion and references have full UUID entropy',()=>{
 const order=createOrder(input());assert.match(order.reference,/^FOND-[A-F0-9]{32}$/);
 assert.ok(order.lines[0].name);assert.equal(order.lines[0].subtotalCents,order.totalCents);
 deleteMenuItem('espresso-single');assert.deepEqual(getOrderByReference(order.reference)?.lines,order.lines);
});
test('status audit is atomic and stale tablet transitions are rejected',()=>{
 const order=createOrder(input());updateOrderStatus(order.id,'accepted','received');
 assert.throws(()=>updateOrderStatus(order.id,'cancelled','received'),/another device/);
 updateOrderStatus(order.id,'ready','accepted');updateOrderStatus(order.id,'completed','ready');
 assert.deepEqual(getOrderEvents(order.id).map(e=>e.to_status),['received','accepted','ready','completed']);
 assert.equal(getOrderEvents(order.id)[1].actor,'shared-staff-tablet');
 assert.throws(()=>updateOrderStatus(order.id,'cancelled','completed'));
 assert.equal(getOrderEvents(order.id).length,4);
});
test('invalid submission rolls back and does not reserve its key',()=>{
 const request=input();assert.throws(()=>createOrder({...request,lines:[]}));
 assert.ok(createOrder(request));
});
