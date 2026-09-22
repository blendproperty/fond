import { test,beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getDb,resetDbForTests } from '../src/lib/db';
import { createOrder,recordPosEntry,updateOrderStatus } from '../src/lib/orders';
import { analytics } from '../src/lib/analytics';
process.env.FOND_DB_PATH=':memory:';
beforeEach(()=>resetDbForTests());
function fixture(created:string,complete=true){const o=createOrder({submissionKey:randomUUID(),customerName:'Analytics fixture',contactNumber:'0821234567',collectionTime:'ASAP',source:'staff',lines:[{id:'espresso-single',quantity:2}]});if(complete){recordPosEntry(o.id,`YOCO-${o.reference}`,'fixture');updateOrderStatus(o.id,'ready');getDb().prepare('INSERT INTO payment_records VALUES (?,?,?,?,?,?,?)').run(randomUUID(),o.id,o.totalCents,'cash',randomUUID(),'fixture',new Date().toISOString());updateOrderStatus(o.id,'completed');}getDb().prepare('UPDATE orders SET created_at=? WHERE id=?').run(created,o.id);return o;}
test('analytics uses Johannesburg boundaries and completed snapshot values, not present-day prices',()=>{
 const prior=fixture('2026-09-13T23:00:00Z'),current=fixture('2026-09-14T22:30:00Z');fixture('2026-09-15T10:00:00Z',false);
 getDb().prepare("UPDATE menu_items SET price_cents=99900 WHERE id='espresso-single'").run();
 const a=analytics('2026-09-15','2026-09-15');assert.equal(a.summary.orders,1);assert.equal(a.previous.orders,1);assert.equal(a.summary.value,current.totalCents);assert.equal(a.previous.value,prior.totalCents);assert.equal(a.products[0].value,6400);assert.equal(a.hours[0].orders,1);assert.equal(a.status.find(s=>s.name==='accepted')?.orders,1);assert.equal(a.daily[0].previousValue,6400);
});
test('empty analytics does not rank zero-sale products and filters fulfilment',()=>{
 fixture('2026-09-15T08:00:00Z');const a=analytics('2026-09-15','2026-09-15','delivery');assert.equal(a.summary.orders,0);assert.deepEqual(a.products,[]);assert.deepEqual(a.categories,[]);assert.ok(a.noSalesCount>0);
 assert.throws(()=>analytics('2026-02-30','2026-03-01'));assert.throws(()=>analytics('2020-01-01','2026-01-01'));
});
test('legacy lines do not invent item value from the current menu',()=>{
 const o=fixture('2026-09-15T08:00:00Z');getDb().prepare('UPDATE orders SET lines_json=? WHERE id=?').run(JSON.stringify([{id:'espresso-single',quantity:2}]),o.id);
 const a=analytics('2026-09-15','2026-09-15');assert.equal(a.summary.value,o.totalCents);assert.equal(a.products[0].unpricedUnits,2);assert.equal(a.products[0].value,0);
});
