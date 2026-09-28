import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {getDb,resetDbForTests} from '../src/lib/db';
import {signUp} from '../src/lib/auth';
import {createOrder,listCustomerOrders,getOrderByReference} from '../src/lib/orders';
import {customerRewards} from '../src/lib/loyalty';

process.env.FOND_DB_PATH=':memory:';
beforeEach(resetDbForTests);
function order(email:string|null,userId?:string){return createOrder({customerName:'History customer',source:'customer',contactNumber:'0821234567',collectionTime:'ASAP',lines:[{id:'espresso-single',quantity:10}],customerEmail:email,userId,rewardEnvironment:'test'});}
function verify(id:string){getDb().prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(new Date().toISOString(),id);}

test('verified customers see historic guest receipts without changing ownership or earning stamps',()=>{
 const guest=order(' Person@Example.test '),u=signUp('person@example.test','history-password').user;
 const own=order(u.email,u.id);
 assert.deepEqual(listCustomerOrders(u.id).map(o=>o.id),[own.id]);
 verify(u.id);
 assert.deepEqual(new Set(listCustomerOrders(u.id).map(o=>o.id)),new Set([guest.id,own.id]));
 assert.equal(getOrderByReference(guest.reference)?.userId,null);
 assert.equal(getDb().prepare('SELECT count(*) AS n FROM loyalty_orders WHERE order_id=?').get(guest.id)?.n,0);
 assert.equal(customerRewards(u.id,'test').stamps,0);
 assert.equal(customerRewards(u.id,'test').rewards.length,0);
 getDb().prepare('UPDATE users SET email_verified_at=NULL WHERE id=?').run(u.id);
 assert.deepEqual(listCustomerOrders(u.id).map(o=>o.id),[own.id]);
});

test('history excludes different email, missing email and orders owned by another account',()=>{
 const u=signUp('person@example.test','history-password').user,other=signUp('other@example.test','history-password').user;verify(u.id);verify(other.id);
 const matching=order(u.email);order('not-person@example.test');order(null);const owned=order(u.email,other.id);
 // Legacy values may predate email normalization.
 getDb().prepare('UPDATE orders SET customer_email=? WHERE id=?').run(' PERSON@EXAMPLE.TEST ',matching.id);
 assert.deepEqual(listCustomerOrders(u.id).map(o=>o.id),[matching.id]);
 assert.deepEqual(listCustomerOrders(other.id).map(o=>o.id),[owned.id]);
 assert.deepEqual(listCustomerOrders('unknown-account'),[]);
});
