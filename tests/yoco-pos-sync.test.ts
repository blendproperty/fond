import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getDb,resetDbForTests} from '../src/lib/db';
import {createOrder,getOrderByReference,searchOrders,updateOrderStatus,getOrderEvents} from '../src/lib/orders';
import {saveDocument,DEFAULT_SETTINGS} from '../src/lib/management';
import {paymentStatus} from '../src/lib/payments';
import {saveProviderSecret,providerSecret} from '../src/lib/provider-secrets';
import {staffNumbersInYocoNote} from '../src/lib/staff-order-number';
import {matchYocoPosOrders,syncYocoPos,yocoPosStatus,configureYocoPos,checkYocoPosConnection,type YocoPosConfig,type YocoPosOrder} from '../src/lib/yoco-pos';

const originalFetch=globalThis.fetch;
const config:YocoPosConfig={enabled:true,environment:'sandbox',locationId:'restaurant-one',eftMappingVerified:true};
beforeEach(()=>{
  process.env.FOND_DB_PATH=':memory:';process.env.FOND_CREDENTIALS_KEY='a'.repeat(64);
  process.env.FOND_PUBLIC_URL='https://fond-test.mid-point.co.za';
  resetDbForTests();
});
afterEach(()=>{globalThis.fetch=originalFetch;resetDbForTests();delete process.env.FOND_PUBLIC_URL;delete process.env.FOND_CREDENTIALS_KEY;});
function makeOrder(submissionKey?:string){return createOrder({customerName:'POS sync test',source:'staff',contactNumber:'0821234567',collectionTime:'ASAP',lines:[{id:'espresso-single',quantity:1}],submissionKey});}
function prepaid(){
  const order=makeOrder();
  getDb().prepare("UPDATE orders SET payment_method='yoco_online',payment_required=1 WHERE id=?").run(order.id);
  getDb().prepare('INSERT INTO payment_records VALUES (?,?,?,?,?,?,?)').run(randomUUID(),order.id,order.totalCents,'yoco',randomUUID(),'yoco-webhook',new Date().toISOString());
  return order;
}
function remote(order:ReturnType<typeof makeOrder>,patch:Partial<YocoPosOrder>={}):YocoPosOrder{
  return {id:randomUUID(),order_number:`POS-${order.staffNumber}`,note:`FOND ${order.staffNumber}`,status:'completed',currency:'ZAR',created_at:new Date().toISOString(),closed_at:new Date().toISOString(),location_id:'restaurant-one',amounts:{net_amount:{amount:order.totalCents,currency:'ZAR'},tip_amount:{amount:0,currency:'ZAR'}},payments:[{payment_method:'other',status:'approved',amount_excl_tip:{amount:order.totalCents,currency:'ZAR'}}],refunds:[],returns:[],...patch};
}
function connected(){
  saveProviderSecret('yoco-secret','sk_test_fixture','test');saveProviderSecret('yoco-webhook','whsec_fixture','test');saveProviderSecret('yoco-pos-key','personal-business-key-fixture','test');
  saveDocument('trading',{...DEFAULT_SETTINGS,allowTestPayments:true},'test');saveDocument('yoco-pos',config,'test');
}

test('six-digit staff numbers are unique, stable on retry, searchable only by staff and never recycled',()=>{
  const key=randomUUID(),a=makeOrder(key),again=makeOrder(key),b=makeOrder();
  assert.equal(a.staffNumber,'100000');assert.equal(again.staffNumber,a.staffNumber);assert.equal(b.staffNumber,'100001');
  assert.equal(getOrderByReference(a.staffNumber),null);assert.equal(getOrderByReference(`FOND ${a.staffNumber}`),null);
  assert.equal(getOrderByReference(a.displayReference)?.id,a.id);assert.equal(searchOrders({query:a.staffNumber})[0].id,a.id);
  updateOrderStatus(a.id,'cancelled');assert.equal(makeOrder().staffNumber,'100002');
  getDb().prepare('UPDATE staff_order_sequence SET next_number=999999').run();
  assert.equal(makeOrder().staffNumber,'999999');assert.throws(()=>makeOrder(),/exhausted/);
  assert.equal((getDb().prepare('SELECT count(*) AS n FROM orders').get() as {n:number}).n,4);
});
test('existing orders receive a number once and retain both old customer references after reopening',()=>{
  const folder=mkdtempSync(join(tmpdir(),'fond-staff-number-'));
  try{
    resetDbForTests();process.env.FOND_DB_PATH=join(folder,'migration.sqlite');
    const a=makeOrder(),b=makeOrder();getDb().prepare('UPDATE orders SET staff_number=NULL WHERE id=?').run(b.id);
    resetDbForTests();const first=getOrderByReference(a.reference)!,migrated=getOrderByReference(b.reference)!;
    assert.equal(first.staffNumber,a.staffNumber);assert.match(migrated.staffNumber,/^[1-9]\d{5}$/);assert.notEqual(migrated.staffNumber,a.staffNumber);
    resetDbForTests();assert.equal(getOrderByReference(b.displayReference)?.staffNumber,migrated.staffNumber);
    assert.notEqual(makeOrder().staffNumber,migrated.staffNumber);
  }finally{resetDbForTests();process.env.FOND_DB_PATH=':memory:';rmSync(folder,{recursive:true,force:true});}
});
test('note matching requires the FOND prefix and exactly six digits, and detects multiple numbers',()=>{
  assert.deepEqual(staffNumbersInYocoNote('Paid online / fond 123456 / collection'),['123456']);
  assert.deepEqual(staffNumbersInYocoNote('FOND-123456 FOND 123456'),['123456']);
  for(const note of ['123456','REFOND 123456','FOND 1234567','FOND 123456X','FOND 123456-789','FOND-ABCD-EFGH'])assert.deepEqual(staffNumbersInYocoNote(note),[]);
  assert.deepEqual(staffNumbersInYocoNote('FOND 123456 FOND 123457'),['123456','123457']);
});
test('a confirmed prepaid order links once, unlocks preparation, and never duplicates payment',()=>{
  const order=prepaid(),pos=remote(order),before=paymentStatus(order.id);
  assert.throws(()=>updateOrderStatus(order.id,'preparing'),/Yoco/);
  assert.deepEqual(matchYocoPosOrders([pos],config),{matched:1,issues:[]});
  assert.equal(getOrderByReference(order.reference)?.posReference,pos.order_number);
  assert.deepEqual(paymentStatus(order.id),before);
  assert.equal(matchYocoPosOrders([pos],config).matched,0);
  assert.equal(getOrderEvents(order.id).filter(e=>e.to_status==='pos-recorded').length,1);
  assert.equal(getOrderEvents(order.id).find(e=>e.to_status==='pos-recorded')?.actor,'yoco-pos-sync');
  assert.equal(updateOrderStatus(order.id,'preparing').status,'preparing');
});
test('duplicate notes across separate POS orders do not pick a winner',()=>{
  const order=prepaid();const result=matchYocoPosOrders([remote(order),remote(order)],config);
  assert.equal(result.matched,0);assert.match(result.issues[0].message,/More than one/);assert.equal(getOrderByReference(order.reference)?.posReference,null);
});
test('mismatched amounts, locations, tips, refunds, pending payments and possible second charges stay unmatched',()=>{
  const patches:Partial<YocoPosOrder>[]=[
    {amounts:{net_amount:{amount:1,currency:'ZAR'},tip_amount:{amount:0,currency:'ZAR'}}},
    {location_id:'other-store'}, {currency:'USD'}, {status:'open'}, {created_at:'2020-01-01T00:00:00Z'},
    {refunds:[{}]},{returns:[{}]},{payments:[]},{order_number:''},
  ];
  for(const patch of patches){const order=prepaid();assert.equal(matchYocoPosOrders([remote(order,patch)],config).matched,0);assert.equal(getOrderByReference(order.reference)?.posReference,null);}
  for(const method of ['card','cash','instant_eft','eft']){const order=prepaid(),pos=remote(order);pos.payments![0].payment_method=method;assert.equal(matchYocoPosOrders([pos],config).matched,0);}
  const order=prepaid(),pos=remote(order);pos.amounts.tip_amount.amount=100;assert.equal(matchYocoPosOrders([pos],config).matched,0);
  pos.amounts.tip_amount.amount=0;pos.payments![0].status='pending';assert.equal(matchYocoPosOrders([pos],config).matched,0);
});
test('a POS receipt is never accepted as proof of online payment and unverified EFT mapping cannot run',()=>{
  const order=makeOrder();getDb().prepare("UPDATE orders SET payment_method='yoco_online' WHERE id=?").run(order.id);
  const pos=remote(order);assert.equal(matchYocoPosOrders([pos],config).matched,0);assert.equal(paymentStatus(order.id).paidCents,0);
  assert.throws(()=>matchYocoPosOrders([pos],{...config,eftMappingVerified:false}),/not been verified/);
});
test('a manual POS reference is preserved and a reference already used elsewhere cannot be auto-linked',()=>{
  const a=prepaid(),b=prepaid(),pos=remote(b);
  getDb().prepare('UPDATE orders SET pos_reference=? WHERE id=?').run(pos.order_number,a.id);
  assert.equal(matchYocoPosOrders([pos],config).matched,0);
  getDb().prepare('UPDATE orders SET pos_reference=? WHERE id=?').run('MANUAL',b.id);
  const result=matchYocoPosOrders([remote(b)],config);assert.equal(result.matched,0);assert.match(result.issues[0].message,/differs/);
});
test('paginated reads collect all results before matching and share a throttle across requests',async()=>{
  connected();const order=prepaid(),pos=remote(order);let calls=0;
  globalThis.fetch=async(input,init)=>{
    const url=new URL(String(input));assert.equal(url.origin,'https://api.yocosandbox.com');assert.equal(init?.redirect,'error');assert.equal(init?.method,undefined);assert.ok(url.searchParams.get('closed_at__gte'));assert.equal(url.searchParams.get('location_id'),'restaurant-one');
    calls++;return Response.json(calls===1?{data:[pos],next_cursor:'page-two'}:{data:[remote(order)],next_cursor:null});
  };
  await syncYocoPos();assert.equal(calls,2);assert.equal(getOrderByReference(order.reference)?.posReference,null);assert.match(yocoPosStatus().issues[0].message,/More than one/);
  await syncYocoPos();assert.equal(calls,2);
});
test('a failed second page applies no matches and does not expose provider error details',async()=>{
  connected();const order=prepaid();let calls=0;
  globalThis.fetch=async()=>++calls===1?Response.json({data:[remote(order)],next_cursor:'more'}):Response.json({secret:'provider-private-payload'},{status:403});
  await syncYocoPos();assert.equal(getOrderByReference(order.reference)?.posReference,null);assert.match(yocoPosStatus().error!,/access was refused/);assert.ok(!yocoPosStatus().error!.includes('provider-private'));
});
test('disabling while a request is in flight prevents linking the returned order',async()=>{
  connected();const order=prepaid();
  globalThis.fetch=async()=>{await configureYocoPos({...config,enabled:false},'test');return Response.json({data:[remote(order)],next_cursor:null});};
  await syncYocoPos();assert.equal(getOrderByReference(order.reference)?.posReference,null);
});
test('connection setup verifies read access, mode and EFT mapping; rotating its encrypted key disables matching',async()=>{
  connected();let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({data:[],next_cursor:null});};
  await assert.rejects(()=>configureYocoPos({...config,eftMappingVerified:false},'test'),/Verify a known/);
  await assert.rejects(()=>configureYocoPos({...config,environment:'live'},'test'),/same live or sandbox/);
  await configureYocoPos(config,'test');assert.equal(calls,1);await checkYocoPosConnection(config);assert.equal(calls,2);
  saveProviderSecret('yoco-pos-key','new-personal-business-key-fixture','test');
  assert.equal(providerSecret('yoco-pos-key'),'new-personal-business-key-fixture');assert.equal(yocoPosStatus().config.enabled,false);assert.equal(yocoPosStatus().config.eftMappingVerified,false);
  const ciphertext=(getDb().prepare("SELECT ciphertext FROM provider_secrets WHERE name='yoco-pos-key'").get() as {ciphertext:Uint8Array}).ciphertext;
  assert.equal(Buffer.from(ciphertext).includes(Buffer.from('new-personal')),false);
  await syncYocoPos();assert.equal(calls,2);
  assert.throws(()=>saveProviderSecret('yoco-pos-key','sk_test_checkout_secret_fixture','test'),/not the online checkout/);
});
