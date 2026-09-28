import {randomUUID} from 'node:crypto';
import {getDb} from './db';
import {document,saveDocument} from './management';
import {providerSecret,providerSecretStatus} from './provider-secrets';
import {customerCheckoutMode} from './payments';
import {staffNumbersInYocoNote} from './staff-order-number';

export type YocoPosConfig={enabled:boolean;environment:'sandbox'|'live';locationId:string;eftMappingVerified:boolean};
export type PosIssue={staffNumber:string;message:string};
type Money={amount:number;currency:string};
export type YocoPosOrder={
  id:string;order_number:string;note?:string|null;status:string;currency:string;
  created_at:string;closed_at:string|null;location_id?:string|null;
  amounts:{net_amount:Money;tip_amount:Money};
  payments?:{payment_method:string;status:string;amount_excl_tip:Money}[];
  refunds?:unknown[];returns?:unknown[];
};
const DEFAULT:YocoPosConfig={enabled:false,environment:'sandbox',locationId:'',eftMappingVerified:false};
const BASE={sandbox:'https://api.yocosandbox.com',live:'https://api.yoco.com'};
const DAY=86400000;
export const yocoPosConfig=()=>document<YocoPosConfig>('yoco-pos',DEFAULT);
export function validateYocoPosConfig(value:unknown):YocoPosConfig {
  const v=value as Partial<YocoPosConfig>|null;
  if(!v||typeof v.enabled!=='boolean'||typeof v.eftMappingVerified!=='boolean'||!['sandbox','live'].includes(v.environment??'')||typeof v.locationId!=='string'||v.locationId.length>150||!/^[\w-]*$/.test(v.locationId))throw new Error('Choose a valid Yoco environment and location.');
  return {enabled:v.enabled,environment:v.environment as YocoPosConfig['environment'],locationId:v.locationId.trim(),eftMappingVerified:v.eftMappingVerified};
}
export function yocoPosStatus(){
  const state=getDb().prepare('SELECT checked_at,error,issues_json FROM yoco_pos_sync_state WHERE id=1').get() as {checked_at:string|null;error:string|null;issues_json:string};
  return {config:yocoPosConfig(),configured:providerSecretStatus('yoco-pos-key'),lastChecked:state.checked_at,error:state.error,issues:JSON.parse(state.issues_json) as PosIssue[]};
}
async function readOrders(config:YocoPosConfig,params:URLSearchParams){
  const key=providerSecret('yoco-pos-key');
  if(!key)throw new Error('Save the Yoco business API key in Settings first.');
  let response:Response;
  try {
    response=await fetch(`${BASE[config.environment]}/v1/orders/?${params}`,{
      headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},
      cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
    });
  }catch{throw new Error('Yoco could not be reached. Manual POS confirmation is still available.');}
  if(!response.ok)throw new Error(response.status===401||response.status===403?'Yoco access was refused. Check the business API key, environment and business/orders:read permission.':response.status===429?'Yoco is busy. Automatic matching will retry shortly.':'Yoco order lookup failed. Manual POS confirmation is still available.');
  const page=await response.json().catch(()=>null) as {data?:YocoPosOrder[];next_cursor?:string|null}|null;
  if(!page||!Array.isArray(page.data)||page.data.length>100||(page.next_cursor!=null&&(typeof page.next_cursor!=='string'||page.next_cursor.length>255)))throw new Error('Yoco returned an invalid order list. No references were matched.');
  return {data:page.data,next_cursor:page.next_cursor??null};
}
export async function checkYocoPosConnection(config:YocoPosConfig){
  const params=new URLSearchParams({limit:'5',status:'completed'});
  if(config.locationId)params.set('location_id',config.locationId);
  const page=await readOrders(config,params);
  return page.data.map(order=>({orderNumber:order.order_number,paymentMethods:[...new Set(order.payments?.map(p=>p.payment_method)??[])]}));
}
export async function configureYocoPos(value:unknown,actor:string){
  const config=validateYocoPosConfig(value);
  if(config.enabled){
    if(!config.eftMappingVerified)throw new Error('Verify a known EFT-closed POS order appears as Other in the connection check before enabling matching.');
    if(config.environment!==customerCheckoutMode())throw new Error('POS matching must use the same live or sandbox mode as FOND online checkout.');
    await checkYocoPosConnection(config);
  }
  saveDocument('yoco-pos',config,actor);
  getDb().prepare('UPDATE yoco_pos_sync_state SET lease=NULL,next_run=0,error=NULL,issues_json=? WHERE id=1').run('[]');
  return yocoPosStatus();
}

// A note is a proposed link, not evidence that FOND received another payment.
// Matching never inserts payment_records, changes a balance, or calls a Yoco write API.
export function matchYocoPosOrders(remote:YocoPosOrder[],config:YocoPosConfig,now=new Date()){
  const db=getDb(),issues:PosIssue[]=[],groups=new Map<string,Map<string,YocoPosOrder>>();
  if(!config.eftMappingVerified)throw new Error('Yoco EFT mapping has not been verified.');
  for(const order of remote){
    if(!order||typeof order.id!=='string')throw new Error('Yoco returned an invalid order. No references were matched.');
    const numbers=staffNumbersInYocoNote(order.note);
    for(const number of numbers){
      if(!groups.has(number))groups.set(number,new Map());
      groups.get(number)!.set(order.id,order);
    }
  }
  let matched=0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for(const [staffNumber,choices] of groups){
      const local=db.prepare('SELECT id,total_cents,created_at,status,pos_reference,payment_method,pos_required FROM orders WHERE staff_number=?').get(staffNumber) as {id:string;total_cents:number;created_at:string;status:string;pos_reference:string|null;payment_method:string;pos_required:number}|undefined;
      if(!local||!['accepted','preparing','ready','out_for_delivery'].includes(local.status))continue;
      const problem=(message:string)=>issues.push({staffNumber,message});
      if(choices.size!==1){problem('More than one Yoco order uses this FOND number. Check the POS entries.');continue;}
      const order=[...choices.values()][0];
      if(staffNumbersInYocoNote(order.note).length!==1){problem('The Yoco note contains more than one FOND number.');continue;}
      if(order.status!=='completed'||!order.closed_at||!Number.isFinite(Date.parse(order.closed_at))||!Number.isFinite(Date.parse(order.created_at))||Date.parse(order.created_at)<Date.parse(local.created_at)-300000||Date.parse(order.closed_at)>now.getTime()+300000){problem('The Yoco order is not a valid closed order for this FOND order.');continue;}
      if(config.locationId&&order.location_id!==config.locationId){problem('The Yoco order belongs to a different location.');continue;}
      if(typeof order.order_number!=='string'||!/^[\w-]{1,100}$/.test(order.order_number)){problem('Yoco did not return a usable POS order number.');continue;}
      if(order.currency!=='ZAR'||order.amounts?.net_amount?.currency!=='ZAR'||order.amounts?.tip_amount?.currency!=='ZAR'||!Number.isSafeInteger(order.amounts?.net_amount?.amount)||!Number.isSafeInteger(order.amounts?.tip_amount?.amount)||order.amounts.tip_amount.amount!==0||order.amounts.net_amount.amount!==local.total_cents){problem('The Yoco order amount does not match FOND, or includes a separate tip. Confirm the items and total.');continue;}
      if((order.refunds?.length??0)>0||(order.returns?.length??0)>0){problem('The Yoco order has a refund or return and needs manual review.');continue;}
      const paid=db.prepare("SELECT coalesce(sum(amount_cents),0) AS n FROM payment_records WHERE order_id=? AND method='yoco'").get(local.id) as {n:number};
      if(local.payment_method!=='yoco_online'||paid.n<local.total_cents){
        // The existing pay-at-collection POS and payment process stays available.
        if(local.payment_method==='yoco_online')problem('Waiting for confirmed FOND online payment.');
        continue;
      }
      // Yoco documents card/cash/instant_eft/gift_voucher/other, not a manual
      // EFT enum. An administrator must verify the restaurant's EFT -> other
      // mapping before enabling this read-only link. Card/instant_eft could be
      // an additional charge, so they deliberately remain unmatched.
      if(!Array.isArray(order.payments)||order.payments.length===0||order.payments.some(p=>p.payment_method!=='other'||p.status!=='approved'||p.amount_excl_tip?.currency!=='ZAR'||!Number.isSafeInteger(p.amount_excl_tip?.amount)||p.amount_excl_tip.amount<0)||order.payments.reduce((sum,p)=>sum+p.amount_excl_tip.amount,0)!==local.total_cents){problem('The prepaid Yoco order does not use the verified EFT payment mapping. Check it manually.');continue;}
      const linked=db.prepare('SELECT order_id FROM yoco_pos_matches WHERE environment=? AND yoco_order_id=?').get(config.environment,order.id) as {order_id:string}|undefined;
      if(linked){if(linked.order_id!==local.id)problem('This Yoco order is already linked to another FOND order.');continue;}
      if(local.pos_reference){if(local.pos_reference!==order.order_number)problem('The recorded POS reference differs from the Yoco match.');continue;}
      if(local.status!=='accepted'||!local.pos_required)continue;
      if(db.prepare('SELECT 1 FROM orders WHERE pos_reference=? COLLATE NOCASE AND id<>?').get(order.order_number,local.id)){problem('This POS reference has already been used.');continue;}
      const at=now.toISOString();
      db.prepare('INSERT INTO yoco_pos_matches VALUES (?,?,?,?,?)').run(config.environment,order.id,local.id,order.order_number,at);
      db.prepare('UPDATE orders SET pos_reference=?,pos_recorded_at=?,pos_recorded_by=?,updated_at=? WHERE id=?').run(order.order_number,at,'yoco-pos-sync',at,local.id);
      db.prepare('INSERT INTO order_events VALUES (?,?,?,?,?,?)').run(randomUUID(),local.id,local.status,'pos-recorded','yoco-pos-sync',at);
      matched++;
    }
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  return {matched,issues};
}

export async function syncYocoPos(){
  const db=getDb(),config=yocoPosConfig();
  if(!config.enabled||!providerSecretStatus('yoco-pos-key'))return;
  const now=Date.now(),lease=randomUUID();
  if(!db.prepare('UPDATE yoco_pos_sync_state SET lease=?,next_run=? WHERE id=1 AND next_run<=?').run(lease,now+300000,now).changes)return;
  try {
    if(!config.eftMappingVerified)throw new Error('Yoco EFT mapping has not been verified.');
    if(config.environment!==customerCheckoutMode())throw new Error('POS matching is paused: Yoco POS and FOND online checkout must use the same live or sandbox mode.');
    const pending=db.prepare("SELECT min(created_at) AS oldest FROM orders WHERE status='accepted' AND pos_reference IS NULL AND pos_required=1 AND payment_method='yoco_online'").get() as {oldest:string|null};
    let result:{matched:number;issues:PosIssue[]}={matched:0,issues:[]};
    if(pending.oldest){
      if(Date.parse(pending.oldest)<now-30*DAY)throw new Error('An unmatched prepaid order is more than 30 days old. Confirm its POS reference manually first.');
      const params=new URLSearchParams({status:'completed',limit:'100',closed_at__gte:new Date(Date.parse(pending.oldest)-300000).toISOString(),closed_at__lte:new Date(now).toISOString()});
      if(config.locationId)params.set('location_id',config.locationId);
      const collected:YocoPosOrder[]=[],cursors=new Set<string>();
      for(let pageNumber=0;;pageNumber++){
        const page=await readOrders(config,params);
        collected.push(...page.data);
        if(!page.next_cursor)break;
        if(pageNumber>=19||cursors.has(page.next_cursor))throw new Error('Yoco returned too many orders or a repeated page. No references were matched; use manual confirmation.');
        cursors.add(page.next_cursor);params.set('cursor',page.next_cursor);
      }
      // A disabled/reconfigured connection or expired lease must not apply an old response.
      const ownsLease=db.prepare('SELECT 1 FROM yoco_pos_sync_state WHERE id=1 AND lease=?').get(lease);
      if(!ownsLease||JSON.stringify(yocoPosConfig())!==JSON.stringify(config))return;
      result=matchYocoPosOrders(collected,config,new Date(now));
    }
    db.prepare('UPDATE yoco_pos_sync_state SET checked_at=?,error=NULL,issues_json=? WHERE id=1 AND lease=?').run(new Date(now).toISOString(),JSON.stringify(result.issues),lease);
  }catch(error){
    // Only our fixed messages may reach staff; never log provider payloads or credentials.
    const message=error instanceof Error&&/^(Yoco|POS matching|An unmatched|Save the Yoco)/.test(error.message)?error.message:'Yoco matching could not complete. Use manual POS confirmation.';
    db.prepare('UPDATE yoco_pos_sync_state SET error=? WHERE id=1 AND lease=?').run(message,lease);
  }finally{db.prepare('UPDATE yoco_pos_sync_state SET lease=NULL,next_run=? WHERE id=1 AND lease=?').run(Date.now()+30000,lease);}
}
