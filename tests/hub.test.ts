import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.FOND_DB_PATH=':memory:';
process.env.FOND_CREDENTIALS_KEY='a'.repeat(64);
process.env.FOND_ADMIN_CODE='isolated-hub-test-admin';
import {hubDb,submitHubRequest,openRequest,listRequests,listEvents,saveEvent,updateRequest,saveBookingUrl,bookingUrl,notifyHubRequest} from '../src/lib/hub-store';
import {hubRedirect} from '../src/lib/domain-routing';
import {saveMember,loginMember} from '../src/lib/team';
import {isValidAdminToken} from '../src/lib/admin-auth';
import {isValidStaffToken} from '../src/lib/staff-auth';
import {callbackBaseUrl,orderingUrl} from '../src/lib/public-url';
const request=(service='gym')=>({service,firstName:'Example',surname:'Applicant',email:`example-${randomUUID()}@example.com`,phone:'0820000000',identity:'SYNTHETIC-PASSPORT',company:'Example tenant',building:'Example unit',consent:true});
test('signup encrypts identity and contact details; retries produce only one durable request',()=>{
  const key=randomUUID(),input=request(),id=submitHubRequest(input,key),db=hubDb();
  assert.equal(submitHubRequest(input,key),id);
  const row=db.prepare('SELECT details FROM hub_requests WHERE id=?').get(id) as {details:string};
  for(const value of [input.identity,input.email,input.phone])assert.ok(!row.details.includes(value));
  assert.equal(openRequest(row.details,id).identity,input.identity);
  assert.throws(()=>openRequest(row.details,'different-id'));
  assert.throws(()=>submitHubRequest({...input,identity:'CHANGED'},key),/changed/);
  assert.equal((db.prepare('SELECT count(*) AS n FROM hub_requests WHERE request_key=?').get(key) as {n:number}).n,1);
});
test('consent, identity, spam and stale event checks happen before saving',()=>{
  assert.throws(()=>submitHubRequest({...request(),consent:false},randomUUID()),/agree/);
  assert.throws(()=>submitHubRequest({...request(),identity:''},randomUUID()),/passport/);
  assert.throws(()=>submitHubRequest({...request(),website:'spam'},randomUUID()),/Unable/);
  assert.throws(()=>submitHubRequest({...request(),kind:'interest',eventId:randomUUID()},randomUUID()),/no longer available/);
  assert.throws(()=>submitHubRequest({...request(),service:'other'},randomUUID()),/Choose/);
});
test('Gym and Padel records, edits and published calendars remain separate',()=>{
  const gymId=submitHubRequest(request(),randomUUID()),padelId=submitHubRequest(request('padel'),randomUUID());
  const gym=listRequests('gym','test-owner');assert.ok(gym.some(r=>r.id===gymId));assert.ok(!gym.some(r=>r.id===padelId));
  assert.throws(()=>updateRequest('gym',padelId,'completed','test-owner'),/not found/);
  const event={calendar:'gym-classes',title:'Example class',description:'Isolated fixture',location:'Example room',startsAt:'2099-10-01T08:00:00+02:00',endsAt:'2099-10-01T09:00:00+02:00',published:false};
  const id=saveEvent('gym',event,'test-owner');assert.ok(!listEvents('gym').some(e=>e.id===id));
  assert.throws(()=>saveEvent('padel',{...event,id,calendar:'padel-events'},'test-owner'),/not found/);
  saveEvent('gym',{...event,id,published:true},'test-owner');assert.ok(listEvents('gym').some(e=>e.id===id));
  assert.ok(!listEvents('padel').some(e=>e.id===id));
  assert.throws(()=>submitHubRequest({...request('padel'),kind:'interest',eventId:id},randomUUID()),/no longer available/);
  assert.ok(submitHubRequest({...request(),kind:'interest',eventId:id,identity:undefined},randomUUID()));
  saveEvent('gym',{...event,id,published:false},'test-owner');assert.ok(!listEvents('gym').some(e=>e.id===id));
  assert.throws(()=>saveEvent('gym',{...event,endsAt:'2099-10-01T07:00:00+02:00'},'test-owner'),/valid start/);
});
test('Hub service accounts cannot authenticate to FOND admin or order queue',()=>{
  for(const role of ['gym','padel','functions']){
    saveMember({name:`Example ${role}`,username:`test-${role}`,role,active:true,password:'A-test-password-123'},'shared-admin');
    const login=loginMember(`test-${role}`,'A-test-password-123');assert.ok(login);
    assert.equal(isValidAdminToken(login.token),false);assert.equal(isValidStaffToken(login.token),false);
  }
});
test('booking links must identify a secure Playtomic venue',()=>{
  for(const url of ['https://evil.example/club','javascript:alert(1)','https://playtomic.com/','https://playtomic.com.evil.example/club'])assert.throws(()=>saveBookingUrl('padel',url,'test-owner'));
  saveBookingUrl('padel','https://playtomic.com/clubs/example-fixture','test-owner');assert.equal(bookingUrl('padel'),'https://playtomic.com/clubs/example-fixture');
  saveBookingUrl('padel','','test-owner');assert.equal(bookingUrl('padel'),null);
});
test('notification contains no applicant identity or contact details and is idempotent',async()=>{
  const {saveProviderSecret}=await import('../src/lib/provider-secrets');const {saveDocument}=await import('../src/lib/management');
  saveProviderSecret('email-api','re_isolated_fake_key','shared-admin');saveDocument('email-from','orders@fond.mid-point.co.za','shared-admin');
  const input=request(),id=submitHubRequest(input,randomUUID()),original=globalThis.fetch;let calls=0;
  process.env.MIDPOINT_HUB_EMAIL_ENABLED='true';
  globalThis.fetch=async(_url,init)=>{calls++;const body=String(init?.body);assert.ok(!body.includes(input.identity));assert.ok(!body.includes(input.phone));const message=JSON.parse(body);if(message.to[0]===input.email){assert.match(message.subject,/Thank you/);assert.match(message.html,/What happens next/);}else{assert.ok(!body.includes(input.email));assert.ok(body.includes('christine@midpointhub.com'));}return Response.json({id:'example-provider-id'});};
  try{await notifyHubRequest(id);await notifyHubRequest(id);assert.equal(calls,2);}finally{globalThis.fetch=original;delete process.env.MIDPOINT_HUB_EMAIL_ENABLED;}
});
test('cutover redirects preserve order references and leave provider callbacks untouched',()=>{
  assert.equal(hubRedirect(new URL('https://fond.mid-point.co.za/?payment=return&reference=EXAMPLE'),'GET',true),'https://midpointhub.com/fond?payment=return&reference=EXAMPLE');
  assert.equal(hubRedirect(new URL('https://fond.mid-point.co.za/staff'),'GET',true),'https://midpointhub.com/staff');
  assert.equal(hubRedirect(new URL('https://fond.mid-point.co.za/api/payments/webhook'),'POST',true),null);
  assert.equal(hubRedirect(new URL('https://fond.mid-point.co.za/api/webhooks/whatsapp'),'GET',true),null);
  assert.equal(hubRedirect(new URL('https://fond.mid-point.co.za/'),'GET',false),null);
  assert.equal(hubRedirect(new URL('https://midpointhub.com/?reference=EXAMPLE'),'GET',true),'https://midpointhub.com/fond?reference=EXAMPLE');
  assert.equal(hubRedirect(new URL('https://www.midpointhub.com/gym?x=1'),'GET',true),'https://midpointhub.com/gym?x=1');
});
test('provider callback base can stay on legacy host while customers use the Hub',()=>{
  process.env.FOND_PUBLIC_URL='https://midpointhub.com';process.env.FOND_CALLBACK_URL='https://fond.mid-point.co.za';process.env.MIDPOINT_HUB_ENABLED='true';
  try{assert.equal(callbackBaseUrl(),'https://fond.mid-point.co.za');assert.equal(orderingUrl(),'https://midpointhub.com/fond');process.env.FOND_CALLBACK_URL='https://wrong.example';assert.throws(()=>callbackBaseUrl());}
  finally{delete process.env.FOND_PUBLIC_URL;delete process.env.FOND_CALLBACK_URL;delete process.env.MIDPOINT_HUB_ENABLED;}
});

test('failed applicant mail retries independently and historic requests are not backfilled',async()=>{
  const input=request('padel'),id=submitHubRequest(input,randomUUID()),original=globalThis.fetch;let applicant=0,staff=0;
  process.env.MIDPOINT_HUB_EMAIL_ENABLED='true';
  globalThis.fetch=async(_url,init)=>{const message=JSON.parse(String(init?.body));if(message.to[0]===input.email){applicant++;if(applicant===1)throw new Error('Isolated provider failure');}else staff++;return Response.json({id:'example-retry-id'});};
  try{
    await notifyHubRequest(id);
    assert.equal(listRequests('padel','test-owner').find(r=>r.id===id)?.notification,'sent');
    assert.equal((hubDb().prepare('SELECT status FROM hub_acknowledgements WHERE id=?').get(id) as {status:string}).status,'failed');
    await notifyHubRequest(id);await notifyHubRequest(id);assert.equal(applicant,2);assert.equal(staff,1);
    const historical=submitHubRequest(request('padel'),randomUUID());hubDb().prepare('DELETE FROM hub_acknowledgements WHERE id=?').run(historical);
    await notifyHubRequest(historical);assert.equal(applicant,2);assert.equal(staff,2);
  }finally{globalThis.fetch=original;delete process.env.MIDPOINT_HUB_EMAIL_ENABLED;}
});
