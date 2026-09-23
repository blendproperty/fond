import {randomUUID} from 'node:crypto';
import {getDb} from './db';

export const VERSIONED_DOCUMENT_KEYS=new Set([
  'trading',
  'content-draft',
  'content-published',
  'message-templates-draft',
  'message-templates-published',
]);

type Snapshot=Record<string,unknown>|unknown[]|string|number|boolean|null;
type ChangeRow={
  id:string;actor:string;area:string;entity_id:string;action:string;
  before_json:string|null;after_json:string|null;reversible:number;
  rolled_back_by:string|null;rolled_back_at:string|null;created_at:string;
};

const encode=(value:unknown)=>value==null?null:JSON.stringify(value);
const decode=(value:string|null):Snapshot=>value==null?null:JSON.parse(value) as Snapshot;
const same=(left:unknown,right:unknown)=>encode(left)===encode(right);

export function menuSnapshot(id:string):Record<string,unknown>|null{
  return getDb().prepare(`SELECT id,name,description,category,price_cents,diet_json,symbol,sort_order,available,is_special,special_label,special_price_cents,modifiers_json,prep_minutes FROM menu_items WHERE id=?`).get(id) as Record<string,unknown>|undefined??null;
}

export function documentSnapshot(key:string):Snapshot{
  const row=getDb().prepare('SELECT value FROM app_documents WHERE key=?').get(key) as {value:string}|undefined;
  return row?JSON.parse(row.value) as Snapshot:null;
}

export function recordAdminChange(input:{actor:string;area:'menu'|'document';entityId:string;action:'create'|'update'|'delete'|'rollback';before:Snapshot;after:Snapshot;reversible?:boolean}){
  if(same(input.before,input.after))return null;
  const id=randomUUID(),now=new Date().toISOString();
  getDb().prepare('INSERT INTO admin_change_versions (id,actor,area,entity_id,action,before_json,after_json,reversible,rolled_back_by,rolled_back_at,created_at) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?)')
    .run(id,input.actor,input.area,input.entityId,input.action,encode(input.before),encode(input.after),input.reversible===false?0:1,now);
  return id;
}

function applyMenuSnapshot(id:string,snapshot:Record<string,unknown>|null){
  const db=getDb();
  if(!snapshot){db.prepare('DELETE FROM menu_items WHERE id=?').run(id);return;}
  db.prepare(`INSERT INTO menu_items (id,name,description,category,price_cents,diet_json,symbol,sort_order,available,is_special,special_label,special_price_cents,modifiers_json,prep_minutes,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,category=excluded.category,price_cents=excluded.price_cents,diet_json=excluded.diet_json,symbol=excluded.symbol,sort_order=excluded.sort_order,available=excluded.available,is_special=excluded.is_special,special_label=excluded.special_label,special_price_cents=excluded.special_price_cents,modifiers_json=excluded.modifiers_json,prep_minutes=excluded.prep_minutes,updated_at=excluded.updated_at`)
    .run(snapshot.id as string,snapshot.name as string,snapshot.description as string,snapshot.category as string,snapshot.price_cents as number,snapshot.diet_json as string,snapshot.symbol as string,snapshot.sort_order as number,snapshot.available as number,snapshot.is_special as number,snapshot.special_label as string|null,snapshot.special_price_cents as number|null,snapshot.modifiers_json as string,snapshot.prep_minutes as number,new Date().toISOString());
}

function applyDocumentSnapshot(key:string,snapshot:Snapshot){
  const db=getDb();
  if(snapshot==null){db.prepare('DELETE FROM app_documents WHERE key=?').run(key);return;}
  db.prepare('INSERT INTO app_documents VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at')
    .run(key,JSON.stringify(snapshot),new Date().toISOString());
}

export function rollbackAdminChange(id:string,actor:string){
  const db=getDb();db.exec('BEGIN IMMEDIATE');
  try{
    const row=db.prepare('SELECT rowid,* FROM admin_change_versions WHERE id=?').get(id) as (ChangeRow&{rowid:number})|undefined;
    if(!row||!row.reversible)throw new Error('This change cannot be rolled back.');
    if(row.rolled_back_at)throw new Error('This change has already been rolled back.');
    const later=db.prepare('SELECT 1 FROM admin_change_versions WHERE area=? AND entity_id=? AND rowid>? LIMIT 1').get(row.area,row.entity_id,row.rowid);
    if(later)throw new Error('A newer change exists. Roll back the latest change first.');
    const before=decode(row.before_json),expected=decode(row.after_json);
    const current=row.area==='menu'?menuSnapshot(row.entity_id):documentSnapshot(row.entity_id);
    if(!same(current,expected))throw new Error('The current value no longer matches this history entry. Refresh before trying again.');
    if(row.area==='menu')applyMenuSnapshot(row.entity_id,before as Record<string,unknown>|null);
    else if(row.area==='document')applyDocumentSnapshot(row.entity_id,before);
    else throw new Error('Unsupported change type.');
    recordAdminChange({actor,area:row.area as 'menu'|'document',entityId:row.entity_id,action:'rollback',before:current,after:before,reversible:false});
    const now=new Date().toISOString();
    db.prepare('UPDATE admin_change_versions SET rolled_back_by=?,rolled_back_at=? WHERE id=?').run(actor,now,id);
    db.prepare('INSERT INTO admin_events VALUES (?,?,?,?,?)').run(randomUUID(),actor,'change-rollback',id,now);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}

const DOCUMENT_LABELS:Record<string,string>={
  trading:'Trading & fulfilment settings',
  'content-draft':'Website content draft',
  'content-published':'Published website content',
  'message-templates-draft':'Email and SMS draft',
  'message-templates-published':'Published email and SMS wording',
};

export function listAdminChanges(limit=100){
  const db=getDb();
  const rows=db.prepare('SELECT rowid,* FROM admin_change_versions ORDER BY rowid DESC LIMIT ?').all(Math.max(1,Math.min(limit,200))) as (ChangeRow&{rowid:number})[];
  const members=new Map((db.prepare('SELECT id,name FROM team_members').all() as {id:string;name:string}[]).map(member=>[member.id,member.name]));
  const latest=new Set<string>();
  return rows.map(row=>{
    const key=`${row.area}:${row.entity_id}`,isLatest=!latest.has(key);latest.add(key);
    const before=decode(row.before_json),after=decode(row.after_json);
    const item=(after??before) as Record<string,unknown>|null;
    const memberId=row.actor.replace(/^(team|super):/,'');
    return {
      id:row.id,actor:row.actor,actorName:members.get(memberId)??(row.actor==='shared-admin'?'Shared admin':row.actor),
      area:row.area,entityId:row.entity_id,action:row.action,before,after,createdAt:row.created_at,
      rolledBackAt:row.rolled_back_at,rolledBackBy:row.rolled_back_by,
      canRollback:!!row.reversible&&!row.rolled_back_at&&isLatest&&row.action!=='rollback',
      label:row.area==='menu'?String(item?.name??row.entity_id):(DOCUMENT_LABELS[row.entity_id]??row.entity_id),
    };
  });
}
