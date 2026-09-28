import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DEFAULT_SETTINGS,orderingAvailable,saveDocument,validateSettings} from '../src/lib/management';
import {tradingWindow,withinTradingWindow} from '../src/lib/trading-hours';
import {collectionSlots} from '../src/lib/fulfilment';
import {resetDbForTests} from '../src/lib/db';
import {createOrder} from '../src/lib/orders';
import {updateMenuItem,getAvailableMenu} from '../src/lib/menu-store';

process.env.FOND_DB_PATH=':memory:';
beforeEach(()=>{resetDbForTests();delete process.env.FOND_HOST;delete process.env.FOND_PUBLIC_URL;});
const hours={...DEFAULT_SETTINGS,enforceHours:true};
const saturday=new Date('2026-10-03T10:00:00+02:00');
const sunday=new Date('2026-10-04T10:00:00+02:00');
const order=(ids:string[],fulfillment:'collection'|'delivery'='collection',collectionTime='ASAP')=>createOrder({submissionKey:randomUUID(),customerName:'Schedule test',contactNumber:'0821234567',building:'Test office',fulfillment,collectionTime,paymentMethod:fulfillment==='delivery'?'yoco_online':'pay_at_collection',source:'customer',lines:ids.map(id=>({id,quantity:1}))});

test('restaurant trades Saturday until noon; truck is weekdays only; both close Sunday',()=>{
  assert.equal(orderingAvailable(hours,saturday),true);
  assert.equal(orderingAvailable(hours,new Date('2026-10-03T11:59:00+02:00')),true);
  assert.equal(orderingAvailable(hours,new Date('2026-10-03T12:00:00+02:00')),false);
  assert.equal(withinTradingWindow(tradingWindow(hours,true,saturday),saturday),false);
  assert.equal(orderingAvailable(hours,sunday),false);
  assert.equal(withinTradingWindow(tradingWindow(hours,true,sunday),sunday),false);
  const friday=new Date('2026-10-02T15:29:00+02:00');
  assert.equal(withinTradingWindow(tradingWindow(hours,true,friday),friday),true);
  const mondayEarly=new Date('2026-09-28T06:59:00+02:00');
  assert.equal(withinTradingWindow(tradingWindow(hours,true,mondayEarly),mondayEarly),false);
});

test('Saturday collection stops at noon and truck/mixed baskets have no weekend slots',()=>{
  const slots=collectionSlots({...tradingWindow(hours,false,saturday),now:saturday,prepMinutes:20,incrementMinutes:15});
  assert.equal(slots.at(-1)?.label,'12:00');
  assert.deepEqual(collectionSlots({...tradingWindow(hours,true,saturday),now:saturday,prepMinutes:20,incrementMinutes:15}),[]);
  assert.deepEqual(collectionSlots({...tradingWindow(hours,false,sunday),now:sunday,prepMinutes:20,incrementMinutes:15}),[]);
});

test('server enforces Saturday category rules for collection and delivery, including mixed baskets',t=>{
  t.mock.timers.enable({apis:['Date'],now:saturday});
  saveDocument('trading',hours,'fixture');
  for(const fulfillment of ['collection','delivery'] as const){
    assert.doesNotThrow(()=>order(['espresso-single'],fulfillment));
    assert.throws(()=>order(['truck-kota-russian'],fulfillment),/Food Truck ordering is closed/);
    assert.throws(()=>order(['espresso-single','truck-kota-russian'],fulfillment),/Food Truck ordering is closed/);
  }
  assert.throws(()=>order(['espresso-single'],'collection','2026-10-03T12:15:00+02:00'),/available collection time/);
  t.mock.timers.setTime(new Date('2026-10-03T11:59:00+02:00').getTime());
  assert.throws(()=>order(['espresso-single']),/cannot be ready before closing/);
  t.mock.timers.setTime(new Date('2026-10-03T12:00:00+02:00').getTime());
  assert.throws(()=>order(['espresso-single'],'delivery'),/closed/);
  t.mock.timers.setTime(sunday.getTime());
  assert.throws(()=>order(['espresso-single']),/closed/);
});

test('admin changes govern future ordering and invalid or incompatible schedules are rejected',()=>{
  const changed=validateSettings({...hours,saturdayClosingTime:'11:00',foodTruckOpenDays:[1,2,3,4,5,6],foodTruckOpeningTime:'08:00',foodTruckClosingTime:'10:30'});
  assert.equal(withinTradingWindow(tradingWindow(changed,true,saturday),saturday),true);
  assert.equal(orderingAvailable(changed,new Date('2026-10-03T11:00:00+02:00')),false);
  assert.throws(()=>validateSettings({...hours,saturdayClosingTime:'06:00'}),/Saturday/);
  assert.throws(()=>validateSettings({...hours,foodTruckOpenDays:[6]}),/within restaurant/);
  assert.throws(()=>validateSettings({...hours,foodTruckOpenDays:[0]}),/within restaurant/);
  assert.throws(()=>validateSettings({...hours,foodTruckOpenDays:[1,1]}),/valid trading days/);
  assert.throws(()=>validateSettings({...hours,foodTruckOpeningTime:'16:00'}),/Food Truck/);
  assert.throws(()=>validateSettings({...hours,foodTruckOpenDays:null}),/valid trading days/);
  assert.doesNotThrow(()=>validateSettings({...hours,openDays:[],foodTruckOpenDays:[]}));
});

test('sold-out items reject old baskets immediately and can be made available again',t=>{
  t.mock.timers.enable({apis:['Date'],now:new Date('2026-09-28T10:00:00+02:00')});
  saveDocument('trading',hours,'fixture');
  getAvailableMenu();
  updateMenuItem('espresso-single',{available:false});
  assert.equal(getAvailableMenu().some(item=>item.id==='espresso-single'),false);
  assert.throws(()=>order(['espresso-single']),/invalid item/i);
  updateMenuItem('espresso-single',{available:true});
  assert.doesNotThrow(()=>order(['espresso-single']));
});
