import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {getDb,resetDbForTests} from '../src/lib/db';
import {createOrder,getOrderByReference,SubmissionConflictError} from '../src/lib/orders';
import {validateDeliveryLocation,deliveryDirections} from '../src/lib/delivery-location';
import {savedOrders} from '../src/lib/saved-orders';
import {migrateBlendDeliveryDirectory,BLEND_DELIVERY_ENTRY} from '../src/lib/delivery-directory-migration';
process.env.FOND_DB_PATH=':memory:';
beforeEach(resetDbForTests);
const pin={latitude:-26.0010063,longitude:28.1237302,accuracy:12};
const input={customerName:'Pin fixture',source:'customer' as const,fulfillment:'delivery' as const,paymentMethod:'yoco_online' as const,contactNumber:'0821234567',building:'OnPoint Building',collectionTime:'ASAP',lines:[{id:'espresso-single',quantity:1}]};

test('delivery pin persists with accuracy and is part of duplicate-submission checks',()=>{
  const submissionKey=randomUUID();
  const first=createOrder({...input,submissionKey,deliveryLocation:pin});
  assert.deepEqual(getOrderByReference(first.reference)?.deliveryLocation,pin);
  assert.equal(createOrder({...input,submissionKey,deliveryLocation:pin}).id,first.id);
  assert.throws(()=>createOrder({...input,submissionKey,deliveryLocation:{...pin,longitude:28.12}}),SubmissionConflictError);
  assert.equal(createOrder(input).deliveryLocation,null);
  assert.throws(()=>createOrder({...input,building:'',deliveryLocation:pin}),/building/);
  assert.throws(()=>createOrder({...input,fulfillment:'collection',deliveryLocation:pin}),/only used for delivery/);
});
test('reject invalid coordinates and accuracy, preserve only numeric pin fields',()=>{
  for(const value of ['-26,28',[],{}, {...pin,latitude:'-26'}, {...pin,latitude:NaN},{...pin,latitude:91},{...pin,longitude:-181},{...pin,accuracy:-1},{...pin,accuracy:Infinity}])assert.throws(()=>validateDeliveryLocation(value),/delivery location/);
  assert.deepEqual(validateDeliveryLocation({...pin,secret:'discard'}),pin);
  assert.equal(validateDeliveryLocation(null),null);
  const url=new URL(deliveryDirections(pin));assert.equal(url.hostname,'www.google.com');assert.equal(url.searchParams.get('destination'),'-26.0010063,28.1237302');
});
test('recent orders discard malformed, stale and duplicated browser entries and are bounded',()=>{
  const now=Date.now(),entry={lookup:'FOND-'+'A'.repeat(32),label:'FOND-7K3P-9Q8R',savedAt:now};
  assert.deepEqual(savedOrders([entry,entry,{...entry,lookup:'https://bad.test'}, {...entry,savedAt:now-31*86400000}],now),[entry]);
  assert.deepEqual(savedOrders({}),[]);
  assert.equal(savedOrders(Array.from({length:12},(_,i)=>({...entry,lookup:'FOND-'+i.toString(16).toUpperCase().padStart(32,'A')})),now).length,10);
});
test('directory migration appends once, preserves settings, is audited and honours later removal',()=>{
  const db=getDb();
  db.prepare('DELETE FROM app_documents WHERE key=?').run('blend-delivery-directory-2026-10-01-v1');
  const before={deliveryLocations:['Existing tenant | Existing building'],orderingEnabled:false,openingTime:'08:30'};
  db.prepare('INSERT INTO app_documents VALUES (?,?,?)').run('trading',JSON.stringify(before),new Date().toISOString());
  migrateBlendDeliveryDirectory(db);migrateBlendDeliveryDirectory(db);
  const after=JSON.parse((db.prepare('SELECT value FROM app_documents WHERE key=?').get('trading') as {value:string}).value);
  assert.deepEqual(after,{...before,deliveryLocations:[...before.deliveryLocations,BLEND_DELIVERY_ENTRY]});
  assert.equal((db.prepare('SELECT COUNT(*) AS count FROM admin_change_versions WHERE actor=?').get('release:blend-delivery-directory-2026-10-01') as {count:number}).count,1);
  db.prepare('UPDATE app_documents SET value=? WHERE key=?').run(JSON.stringify(before),'trading');
  migrateBlendDeliveryDirectory(db);
  assert.deepEqual(JSON.parse((db.prepare('SELECT value FROM app_documents WHERE key=?').get('trading') as {value:string}).value),before);
});
