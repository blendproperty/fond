import {before,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';

process.env.FOND_DB_PATH=':memory:';
let resetDbForTests:typeof import('../src/lib/db').resetDbForTests;
let getDb:typeof import('../src/lib/db').getDb;
let getFullMenu:typeof import('../src/lib/menu-store').getFullMenu;
let updateMenuItem:typeof import('../src/lib/menu-store').updateMenuItem;
let createMenuItem:typeof import('../src/lib/menu-store').createMenuItem;
let deleteMenuItem:typeof import('../src/lib/menu-store').deleteMenuItem;
let listAdminChanges:typeof import('../src/lib/change-history').listAdminChanges;
let rollbackAdminChange:typeof import('../src/lib/change-history').rollbackAdminChange;
let saveDocument:typeof import('../src/lib/management').saveDocument;
let settings:typeof import('../src/lib/management').settings;
let DEFAULT_SETTINGS:typeof import('../src/lib/management').DEFAULT_SETTINGS;

before(async()=>{
  ({resetDbForTests,getDb}=await import('../src/lib/db'));
  ({getFullMenu,updateMenuItem,createMenuItem,deleteMenuItem}=await import('../src/lib/menu-store'));
  ({listAdminChanges,rollbackAdminChange}=await import('../src/lib/change-history'));
  ({saveDocument,settings,DEFAULT_SETTINGS}=await import('../src/lib/management'));
});

beforeEach(()=>resetDbForTests());

test('records the named actor and rolls back the latest menu edit',()=>{
  const item=getFullMenu().find(entry=>entry.id==='espresso-single')!;
  updateMenuItem(item.id,{price:item.price+500},'team:ray');
  const [change]=listAdminChanges();
  assert.equal(change.actor,'team:ray');
  assert.equal(change.area,'menu');
  assert.equal(change.label,item.name);
  assert.equal(change.canRollback,true);
  assert.equal((change.before as Record<string,unknown>).price_cents,item.price);
  assert.equal((change.after as Record<string,unknown>).price_cents,item.price+500);

  rollbackAdminChange(change.id,'super:brett');
  assert.equal(getFullMenu().find(entry=>entry.id===item.id)?.price,item.price);
  const changes=listAdminChanges();
  assert.equal(changes[0].action,'rollback');
  assert.equal(changes[0].actor,'super:brett');
  assert.equal(changes.find(entry=>entry.id===change.id)?.rolledBackAt!=null,true);
});

test('prevents an older history row overwriting a newer menu edit',()=>{
  const item=getFullMenu().find(entry=>entry.id==='espresso-single')!;
  updateMenuItem(item.id,{price:item.price+100},'team:ray');
  const first=listAdminChanges()[0];
  updateMenuItem(item.id,{price:item.price+200},'team:michelle');
  assert.throws(()=>rollbackAdminChange(first.id,'super:brett'),/newer change/i);
  assert.equal(getFullMenu().find(entry=>entry.id===item.id)?.price,item.price+200);
});

test('rolls back menu creation and deletion without losing the saved row',()=>{
  const created=createMenuItem({id:'audit-toastie',name:'Audit Toastie',description:'Test',category:'Sandwiches',price:7700},'team:ray');
  const createChange=listAdminChanges()[0];
  rollbackAdminChange(createChange.id,'super:brett');
  assert.equal(getFullMenu().some(item=>item.id===created.id),false);

  const restored=createMenuItem({id:'audit-toastie',name:'Audit Toastie',description:'Test',category:'Sandwiches',price:7700});
  deleteMenuItem(restored.id,'team:ray');
  const deleteChange=listAdminChanges()[0];
  rollbackAdminChange(deleteChange.id,'super:brett');
  assert.equal(getFullMenu().find(item=>item.id===restored.id)?.price,7700);
});

test('versions trading settings and restores the prior configuration',()=>{
  saveDocument('trading',{...DEFAULT_SETTINGS,maxActiveOrders:40},'team:ray');
  saveDocument('trading',{...settings(),maxActiveOrders:25},'team:michelle');
  const latest=listAdminChanges().find(change=>change.entityId==='trading')!;
  assert.equal((latest.before as Record<string,unknown>).maxActiveOrders,40);
  assert.equal((latest.after as Record<string,unknown>).maxActiveOrders,25);
  rollbackAdminChange(latest.id,'super:brett');
  assert.equal(settings().maxActiveOrders,40);
});

test('does not copy provider configuration or passwords into reversible history',()=>{
  saveDocument('twilio-config',{accountSid:'sensitive-account',sender:'whatsapp:+27000000000'},'shared-admin');
  assert.equal(listAdminChanges().length,0);
  assert.equal((getDb().prepare('SELECT count(*) AS n FROM admin_change_versions').get() as {n:number}).n,0);
});
