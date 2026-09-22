import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('HTTP retry, access boundaries and audited lifecycle',async({request})=>{
  expect((await request.get('/api/staff/orders')).status()).toBe(401);
  expect((await request.get('/api/staff/orders/unknown/history')).status()).toBe(401);
  expect((await request.patch('/api/staff/orders/unknown',{data:{status:'accepted'}})).status()).toBe(401);
  const data={customerName:'Reliability test',contactNumber:'0821234567',lines:[{id:'espresso-single',quantity:1}],collectionTime:'ASAP'};
  const headers={'Idempotency-Key':randomUUID()};
  const first=await request.post('/api/orders',{data,headers});expect(first.status()).toBe(201);
  const order=await first.json();
  expect(order.displayReference).toMatch(/^FOND-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  expect(await (await request.post('/api/orders',{data,headers})).json()).toEqual(order);
  expect((await request.post('/api/orders',{data:{...data,customerName:'Changed'},headers})).status()).toBe(409);
  const login=await request.post('/api/staff/login',{data:{code:process.env.FOND_STAFF_CODE}});expect(login.ok()).toBeTruthy();
  // Local HTTP test transport: explicitly forward the server-issued Secure cookie.
  const staffHeaders={Cookie:login.headers()['set-cookie'].split(';')[0]};
  expect((await request.get('/api/admin/orders',{headers:staffHeaders})).status()).toBe(401);
  const queue=await (await request.get('/api/staff/orders',{headers:staffHeaders})).json();
  const matching=queue.orders.filter((o:{reference:string})=>o.reference===order.reference);expect(matching).toHaveLength(1);
  const id=matching[0].id;
  const search=await (await request.get(`/api/staff/orders?query=${order.displayReference}`,{headers:staffHeaders})).json();expect(search.orders).toHaveLength(1);expect(search.orders[0].displayReference).toBe(order.displayReference);
  const publicLookup=await (await request.get(`/api/orders?reference=${order.displayReference}`)).json();expect(publicLookup.reference).toBe(order.reference);expect(publicLookup.displayReference).toBe(order.displayReference);
  expect((await request.patch(`/api/staff/orders/${id}`,{headers:staffHeaders,data:{expectedStatus:'received',status:'accepted'}})).ok()).toBeTruthy();
  expect((await request.patch(`/api/staff/orders/${id}`,{headers:staffHeaders,data:{expectedStatus:'accepted',status:'ready'}})).status()).toBe(409);
  const yocoReference=`YOCO-${order.reference}`;
  expect((await request.post(`/api/staff/orders/${id}/pos-entry`,{headers:staffHeaders,data:{posReference:yocoReference}})).ok()).toBeTruthy();
  const second=await request.post('/api/staff/orders',{headers:{...staffHeaders,'Idempotency-Key':randomUUID()},data:{customerName:'Duplicate reference test',contactNumber:'0827654321',collectionTime:'ASAP',lines:[{id:'espresso-single',quantity:1}]}});expect(second.ok()).toBeTruthy();const secondOrder=(await second.json()).order;
  const duplicate=await request.post(`/api/staff/orders/${secondOrder.id}/pos-entry`,{headers:staffHeaders,data:{posReference:` ${yocoReference.toLowerCase()} `}});expect(duplicate.status()).toBe(409);expect((await duplicate.json()).message).toMatch(new RegExp(`cannot use this Yoco reference.*already been used for order ${order.displayReference}`));
  expect((await request.patch(`/api/staff/orders/${id}`,{headers:staffHeaders,data:{expectedStatus:'accepted',status:'ready'}})).ok()).toBeTruthy();
  expect((await request.post(`/api/staff/orders/${id}/payment`,{headers:staffHeaders,data:{method:'cash'}})).ok()).toBeTruthy();
  expect((await request.patch(`/api/staff/orders/${id}`,{headers:staffHeaders,data:{expectedStatus:'ready',status:'completed'}})).ok()).toBeTruthy();
  expect((await request.patch(`/api/staff/orders/${id}`,{headers:staffHeaders,data:{expectedStatus:'received',status:'cancelled'}})).ok()).toBeFalsy();
  const history=await (await request.get(`/api/staff/orders/${id}/history`,{headers:staffHeaders})).json();
  expect(history.events.map((e:{to_status:string})=>e.to_status)).toEqual(['received','accepted','pos-recorded','ready','completed']);
  expect((await (await request.get(`/api/orders?reference=${order.reference}`)).json()).status).toBe('completed');
});
