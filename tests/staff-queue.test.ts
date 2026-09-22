import {test} from 'node:test';
import assert from 'node:assert/strict';
import {QUEUE_LANES,queueLane,laneTiming,type QueueOrder} from '../src/lib/staff-queue';

const createdAt='2026-09-15T10:00:00.000Z';
const base:QueueOrder={status:'received',fulfillment:'collection',posRecordedAt:null,posRequired:true,createdAt,updatedAt:createdAt,totalCents:9500,estimatedPrepMinutes:16,payment:{paidCents:0,checkout:null}};

test('seven lanes show confirmed payment, Yoco entry, preparation, dispatch and correct fulfilment',()=>{
  assert.equal(QUEUE_LANES.length,7);
  assert.equal(queueLane(base),'new');
  assert.equal(queueLane({...base,payment:{paidCents:0,checkout:'pending',checkoutUpdatedAt:createdAt}}),'payment');
  assert.equal(queueLane({...base,status:'accepted',posRecordedAt:createdAt}),'yoco');
  assert.equal(queueLane({...base,status:'preparing'}),'preparing');
  assert.equal(queueLane({...base,status:'ready',fulfillment:'delivery'}),'delivery');
  assert.equal(queueLane({...base,status:'out_for_delivery',fulfillment:'delivery'}),'out');
  assert.equal(queueLane({...base,status:'ready'}),'collection');
  assert.equal(queueLane({...base,payment:{paidCents:9500,checkout:'paid'}}),'new');
});

test('delay starts when a stage is entered and uses preparation setting',()=>{
  const now=Date.parse('2026-09-15T10:26:00.000Z');
  const preparing={...base,status:'preparing' as const,updatedAt:'2026-09-15T10:10:00.000Z'};
  assert.deepEqual(laneTiming(preparing,now),{lane:'preparing',targetMinutes:16,elapsedMinutes:16,delayed:false});
  assert.deepEqual(laneTiming({...preparing,estimatedPrepMinutes:15},now,{new:5,payment:10,yoco:5,preparing:20,delivery:10,out:10,collection:10}),{lane:'preparing',targetMinutes:15,elapsedMinutes:16,delayed:true});
  assert.equal(laneTiming({...base,status:'accepted',posRecordedAt:'2026-09-15T10:24:00.000Z'},now).delayed,false);
});
test('an online-payment order stays in the payment lane before checkout creation',()=>{
  assert.equal(queueLane({...base,paymentRequired:true,payment:{paidCents:0,checkout:null}}),'payment');
  assert.equal(queueLane({...base,paymentRequired:true,payment:{paidCents:9500,checkout:'paid'}}),'new');
});
