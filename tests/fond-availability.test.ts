import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fondAvailability} from '../src/lib/fond-availability';
test('FOND first action reflects hours, sandbox readiness and real collection options',()=>{
 const collection={collectionEnabled:true,deliveryEnabled:true};
 assert.equal(fondAvailability(false,collection,'live').action,'Browse menu');
 const sandbox=fondAvailability(true,collection,'sandbox');assert.equal(sandbox.publicReady,false);assert.equal(sandbox.action,'Browse menu');assert.match(sandbox.status,/test mode/);
 assert.equal(fondAvailability(true,collection,'none').action,'Order now');
 assert.equal(fondAvailability(true,{collectionEnabled:false,deliveryEnabled:false},'live').action,'Browse menu');
 assert.equal(fondAvailability(true,{collectionEnabled:false,deliveryEnabled:true},'live').publicReady,true);
});
