import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectionSlots,deliveryLocationValue,formatCollectionTime,validateScheduledCollection} from '../src/lib/fulfilment';

const settings={collectionSlotIncrementMinutes:15,openingTime:'07:00',closingTime:'17:00',openDays:[1,2,3,4,5]};

test('collection choices start after preparation and follow the configured interval',()=>{
  const now=new Date('2026-09-28T06:07:00+02:00');
  const slots=collectionSlots({...settings,incrementMinutes:settings.collectionSlotIncrementMinutes,prepMinutes:20,now,days:1});
  assert.equal(slots[0].value,'As soon as possible');
  assert.equal(slots[1].value,'2026-09-28T07:00:00+02:00');
  assert.equal(slots[2].value,'2026-09-28T07:15:00+02:00');
  assert.doesNotThrow(()=>validateScheduledCollection(slots[2].value,20,settings,now));
  assert.throws(()=>validateScheduledCollection('2026-09-28T07:10:00+02:00',20,settings,now),/available/);
});

test('collection choices round up from basket preparation time',()=>{
  const now=new Date('2026-09-28T09:07:00+02:00');
  const slots=collectionSlots({...settings,incrementMinutes:15,prepMinutes:20,now,days:1});
  assert.equal(slots[1].label,'09:30');
  assert.equal(formatCollectionTime(slots[1].value),'Mon, 28 Sept, 09:30');
});

test('delivery directory rows split business and building safely',()=>{
  assert.deepEqual(deliveryLocationValue('Redington South Africa | OnPoint · L2-1-08'),{business:'Redington South Africa',building:'OnPoint · L2-1-08'});
});
