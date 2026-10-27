import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateScheduledDelivery,deliveryArrivalAt,assertFoodTruckOrderingAvailable,collectionSlots,deliveryLocationValue,formatCollectionTime,isBeforeDailyCutoff,validateScheduledCollection} from '../src/lib/fulfilment';

const settings={collectionSlotIncrementMinutes:15,openingTime:'07:00',closingTime:'18:30',openDays:[1,2,3,4,5]};

test('collection choices start after preparation and follow the configured interval',()=>{
  const now=new Date('2026-09-28T06:07:00+02:00');
  const slots=collectionSlots({...settings,incrementMinutes:settings.collectionSlotIncrementMinutes,prepMinutes:20,now});
  assert.equal(slots[0].value,'As soon as possible');
  assert.equal(slots[1].value,'2026-09-28T07:00:00+02:00');
  assert.equal(slots[2].value,'2026-09-28T07:15:00+02:00');
  assert.doesNotThrow(()=>validateScheduledCollection(slots[2].value,20,settings,now));
  assert.throws(()=>validateScheduledCollection('2026-09-28T07:10:00+02:00',20,settings,now),/available/);
});

test('collection choices round up from basket preparation time',()=>{
  const now=new Date('2026-09-28T09:07:00+02:00');
  const slots=collectionSlots({...settings,incrementMinutes:15,prepMinutes:20,now});
  assert.equal(slots[1].label,'09:30');
  assert.equal(formatCollectionTime(slots[1].value),'Mon, 28 Sept, 09:30');
});

test('collection choices stay on today and include the 18:30 kitchen close',()=>{
  const now=new Date('2026-09-28T17:55:00+02:00');
  const slots=collectionSlots({...settings,incrementMinutes:15,prepMinutes:20,now});
  assert.equal(slots.at(-1)?.value,'2026-09-28T18:30:00+02:00');
  assert.ok(slots.every(slot=>slot.value==='As soon as possible'||slot.value.startsWith('2026-09-28T')));
  assert.throws(()=>validateScheduledCollection('2026-09-29T07:00:00+02:00',20,settings,now),/today/);
});

test('collection closes when the basket cannot be ready by 18:30',()=>{
  const now=new Date('2026-09-28T18:11:00+02:00');
  assert.deepEqual(collectionSlots({...settings,incrementMinutes:15,prepMinutes:20,now}),[]);
  assert.throws(()=>validateScheduledCollection('2026-09-28T18:30:00+02:00',20,settings,now),/today/);
});

test('delivery directory rows split business and building safely',()=>{
  assert.deepEqual(deliveryLocationValue('Redington South Africa | OnPoint · L2-1-08'),{business:'Redington South Africa',building:'OnPoint · L2-1-08'});
});

test('Food Truck ordering closes at 15:30 for customer orders while staff can still assist',()=>{
  const monday=[1,2,3,4,5];
  assert.equal(isBeforeDailyCutoff('15:30',monday,new Date('2026-09-28T15:29:00+02:00')),true);
  assert.equal(isBeforeDailyCutoff('15:30',monday,new Date('2026-09-28T15:30:00+02:00')),false);
  assert.doesNotThrow(()=>assertFoodTruckOrderingAvailable({hasFoodTruck:true,source:'customer',enforceHours:true,cutoffTime:'15:30',openDays:monday,now:new Date('2026-09-28T15:29:00+02:00')}));
  assert.throws(()=>assertFoodTruckOrderingAvailable({hasFoodTruck:true,source:'customer',enforceHours:true,cutoffTime:'15:30',openDays:monday,now:new Date('2026-09-28T15:30:00+02:00')}),/close at 15:30/);
  assert.doesNotThrow(()=>assertFoodTruckOrderingAvailable({hasFoodTruck:true,source:'staff',enforceHours:true,cutoffTime:'15:30',openDays:monday,now:new Date('2026-09-28T16:00:00+02:00')}));
});

test('Food Truck collection choices stop at 15:30',()=>{
  const now=new Date('2026-09-28T14:37:00+02:00');
  const slots=collectionSlots({...settings,closingTime:'15:30',incrementMinutes:15,prepMinutes:20,now});
  assert.equal(slots.at(-1)?.label,'15:30');
  assert.equal(slots.some(slot=>slot.label==='15:45'),false);
});


test('delivery slots allow preparation, queue, vehicle travel and recipient handover',()=>{
  const now=new Date('2026-10-01T09:07:00+02:00');
  const deliverySettings={...settings,deliveryAllowanceMinutes:15};
  const prepAndQueue=25;
  const slots=collectionSlots({...settings,prepMinutes:prepAndQueue+15,incrementMinutes:15,now});
  assert.equal(slots[0].label,'As soon as possible · approx. 40 min');
  assert.equal(slots[1].label,'10:00');
  assert.doesNotThrow(()=>validateScheduledDelivery(slots[1].value,prepAndQueue,deliverySettings,now,true));
  for(const value of ['2026-10-01T09:45:00+02:00','2026-10-02T10:00:00+02:00','invalid','10:00',''])assert.throws(()=>validateScheduledDelivery(value,prepAndQueue,deliverySettings,now,true),/available delivery time/);
  assert.throws(()=>validateScheduledDelivery('ASAP',20,deliverySettings,new Date('2026-10-01T17:55:01+02:00'),true),/Delivery is closed/);
  assert.throws(()=>validateScheduledDelivery('ASAP',20,deliverySettings,new Date('2026-10-01T18:00:00+02:00'),true),/Delivery is closed/);
  assert.throws(()=>validateScheduledDelivery('ASAP',20,deliverySettings,new Date('2026-10-04T09:00:00+02:00'),true),/Delivery is closed/);
  assert.throws(()=>validateScheduledDelivery('ASAP',20,{...deliverySettings,closingTime:'15:30'},new Date('2026-10-01T15:00:00+02:00'),true),/Delivery is closed/);
});

test('delivery arrival includes travel before and after dispatch, with scheduled arrivals retained',()=>{
  const order={collectionTime:'ASAP',createdAt:'2026-10-01T07:00:00Z',updatedAt:'2026-10-01T07:20:00Z',status:'received',estimatedPrepMinutes:20};
  assert.equal(deliveryArrivalAt(order,15),'2026-10-01T07:35:00.000Z');
  assert.equal(deliveryArrivalAt({...order,collectionTime:'2026-10-01T10:00:00+02:00'},15),'2026-10-01T08:00:00.000Z');
  assert.equal(deliveryArrivalAt({...order,status:'out_for_delivery'},15),'2026-10-01T07:35:00.000Z');
  for(const status of ['completed','cancelled'])assert.equal(deliveryArrivalAt({...order,status},15),null);
});
