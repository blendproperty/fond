import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {getDb} from './db';
import {customerCheckoutMode} from './payments';
import {providerSecretStatus,providerSecret} from './provider-secrets';
import {readOrders,yocoPosConfig,type YocoPosOrder} from './yoco-pos';
import {reconcileBalance,type RewardEnvironment} from './loyalty';

type Variant={id:string;name:string};
type Config={enabled:boolean;revision:number;batch:string;variants:Variant[]};
type Line={id:string;variant_id?:string;name:string;quantity:string;net_amount:{amount:number;currency:string}};
export type CounterSale=YocoPosOrder&{line_items?:Line[];channel?:string|null;external_id?:string|null};
type Entry={id:string;environment:RewardEnvironment;yoco_id:string;user_id:string;quantity:number;credited:number;batch:string;order_number:string;location_id:string;snapshot_json:string};
const stampTime=()=>new Date().toISOString();
function audit(subject:string,action:string,actor:string,detail:string){getDb().prepare('INSERT INTO loyalty_events VALUES (?,?,?,?,?,?)').run(randomUUID(),subject,action,actor,detail,stampTime());}
function transaction<T>(fn:()=>T):T{const db=getDb();db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
export function counterConfig():Config{const r=getDb().prepare('SELECT * FROM counter_reward_settings WHERE id=1').get()!;return {enabled:!!r.enabled,revision:Number(r.revision),batch:String(r.batch),variants:JSON.parse(String(r.variants_json))};}
function environment():RewardEnvironment{const mode=customerCheckoutMode();if(mode==='none')throw new Error('Configure matching Yoco checkout and POS environments before starting the trial.');return mode==='live'?'live':'test';}
function connection(){const c=yocoPosConfig();if(!providerSecretStatus('yoco-pos-key'))throw new Error('Save the Yoco business API key in Settings first.');if(c.environment!==customerCheckoutMode())throw new Error('Yoco POS and FOND payment environments must match.');if(!c.locationId)throw new Error('Set the restaurant Yoco location in Settings before starting counter rewards.');return c;}
function fingerprint(){return createHash('sha256').update(JSON.stringify([counterConfig(),yocoPosConfig(),customerCheckoutMode(),providerSecret('yoco-pos-key')])).digest('hex');}
export function counterAvailable(){try{return counterConfig().enabled&&!!connection();}catch{return false;}}
export function memberCard(userId:string){const db=getDb();if(!db.prepare('SELECT 1 FROM users WHERE id=? AND email_verified_at IS NOT NULL').get(userId))throw new Error('Verify your email first.');db.prepare('INSERT OR IGNORE INTO loyalty_members VALUES (?,?)').run(userId,'FOND-M-'+randomBytes(6).toString('hex').toUpperCase());return {code:String(db.prepare('SELECT code FROM loyalty_members WHERE user_id=?').get(userId)!.code),enabled:counterAvailable()};}
function member(code:string){if(!/^FOND-M-[A-F0-9]{12}$/.test(code))throw new Error('Enter the membership number from the customer’s coffee card.');const u=getDb().prepare('SELECT u.id,u.email FROM loyalty_members m JOIN users u ON u.id=m.user_id WHERE m.code=? AND u.email_verified_at IS NOT NULL').get(code) as {id:string;email:string}|undefined;if(!u)throw new Error('Membership unavailable. Ask the customer to verify their account email.');return u;}
export function counterStatus(){return {config:counterConfig(),available:counterAvailable(),environment:customerCheckoutMode()==='live'?'live':'test',configured:providerSecretStatus('yoco-pos-key'),locationId:yocoPosConfig().locationId,sales:getDb().prepare('SELECT id,environment,order_number,sale_date,quantity,credited,batch,actor,created_at,reason,checked_at,check_error FROM counter_reward_sales ORDER BY rowid DESC LIMIT 100').all()};}
function dateRange(date:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Choose a valid receipt date.');const start=Date.parse(date+'T00:00:00+02:00');if(start>Date.now()||start<Date.now()-31*86400000)throw new Error('Choose a receipt from the last 30 days.');return {start:new Date(start).toISOString(),end:new Date(start+86400000-1).toISOString()};}
export async function findCounterSale(date:string,number:string){
 if(!/^[\w-]{1,100}$/.test(number))throw new Error('Enter the Yoco order number printed on the receipt.');
 const config=connection(),range=dateRange(date),params=new URLSearchParams({limit:'100',closed_at__gte:range.start,closed_at__lte:range.end,location_id:config.locationId});
 const orders=new Map<string,CounterSale>(),cursors=new Set<string>();
 for(let i=0;;i++){const page=await readOrders(config,params);for(const raw of page.data){if(raw.order_number===number&&raw.location_id===config.locationId&&raw.closed_at&&Date.parse(raw.closed_at)>=Date.parse(range.start)&&Date.parse(raw.closed_at)<=Date.parse(range.end))orders.set(raw.id,raw as CounterSale);}if(!page.next_cursor)break;if(i>=19||cursors.has(page.next_cursor))throw new Error('Yoco lookup is incomplete. No stamps were added. Narrow the receipt date or try again.');cursors.add(page.next_cursor);params.set('cursor',page.next_cursor);}
 if(orders.size!==1)throw new Error(orders.size?'More than one Yoco sale has this number on that date. Ask an administrator to review.':'No Yoco sale found for this date and restaurant.');
 return [...orders.values()][0];
}
function safeLines(order:CounterSale){if(!Array.isArray(order.line_items)||!order.line_items.length||order.line_items.length>200)throw new Error('Yoco did not return item details. No stamps can be verified.');return order.line_items.map(l=>{const q=Number(l.quantity);if(typeof l.id!=='string'||typeof l.name!=='string'||!Number.isInteger(q)||q<1||q>100||l.net_amount?.currency!=='ZAR'||!Number.isSafeInteger(l.net_amount.amount)||l.net_amount.amount<0)throw new Error('Yoco item details need review. No stamps were added.');return {id:l.id,variantId:l.variant_id??'',name:l.name.slice(0,150),quantity:q,amount:l.net_amount.amount};});}
function refunded(order:CounterSale){return !!(order.refunds?.length||order.returns?.length||order.payments?.some(p=>{const detail=p as typeof p&{refunded_amount?:{amount:number};refunds?:unknown[]};return !!detail.refunds?.length||(detail.refunded_amount?.amount??0)>0;}));}
function eligible(order:CounterSale,variants:Variant[]){
 if(!order.id||order.status!=='completed'||!order.closed_at||!Number.isFinite(Date.parse(order.closed_at))||Date.parse(order.closed_at)>Date.now()+300000||order.currency!=='ZAR'||order.amounts?.net_amount?.currency!=='ZAR'||!Number.isSafeInteger(order.amounts.net_amount.amount)||order.amounts.net_amount.amount<=0)throw new Error('Only completed, paid Yoco sales can earn stamps.');
 if(refunded(order))throw new Error('This sale has a refund or return. It cannot earn stamps.');
 // Prepaid FOND closures use Other. Online/external sales must never be counted a second time.
 if(order.external_id||order.channel&&order.channel!=='pos'||/\bFOND\b/i.test(order.note??''))throw new Error('This sale may already belong to a FOND or external order. Counter stamps are blocked.');
 const payments=order.payments;
 if(!payments?.length||payments.some(p=>!['card','cash'].includes(p.payment_method)||p.status!=='approved'||p.amount_excl_tip?.currency!=='ZAR'||!Number.isSafeInteger(p.amount_excl_tip.amount)||p.amount_excl_tip.amount<=0)||payments.reduce((n,p)=>n+p.amount_excl_tip.amount,0)!==order.amounts.net_amount.amount)throw new Error('A paid counter cash/card sale is required. Prepaid EFT closures and unconfirmed payments do not earn again.');
 const db=getDb(),env=environment();
 if(db.prepare('SELECT 1 FROM yoco_pos_matches WHERE environment=? AND yoco_order_id=?').get(env==='test'?'sandbox':'live',order.id)||db.prepare('SELECT 1 FROM orders WHERE pos_reference=? COLLATE NOCASE').get(order.order_number))throw new Error('This receipt is already recorded in FOND. Do not add counter stamps for it.');
 const lines=safeLines(order),ids=new Set(variants.map(v=>v.id));
 // Discounted lines can contain a free unit among paid units; fail closed instead of guessing.
 const coffees=lines.filter(l=>ids.has(l.variantId)&&l.amount>0);
 for(const line of coffees){const raw=order.line_items!.find(l=>l.id===line.id) as Line&{discount_amount?:{amount:number}};if(raw.discount_amount?.amount)throw new Error('Discounted coffee lines need review; stamps were not added.');}
 const quantity=coffees.reduce((n,l)=>n+l.quantity,0);
 if(quantity<1||quantity>100)throw new Error('No qualifying paid coffees found. Check the administrator’s coffee item mapping.');
 return {lines,quantity};
}
export async function inspectCounterReceipt(date:string,number:string){const sale=await findCounterSale(date,number);return {items:safeLines(sale).filter(l=>l.variantId),orderNumber:sale.order_number};}
export async function configureCounter(input:{enabled:boolean;variants:Variant[]},actor:string){
 const before=fingerprint();
 if(typeof input.enabled!=='boolean'||!Array.isArray(input.variants)||input.variants.length>100||input.variants.some(v=>typeof v.id!=='string'||!v.id||v.id.length>200||typeof v.name!=='string'||!v.name||v.name.length>150))throw new Error('Choose valid Yoco coffee items.');
 if(input.enabled){connection();if(!input.variants.length)throw new Error('Load a Yoco receipt and select the qualifying Coffee items first.');await readOrders(connection(),new URLSearchParams({limit:'1',location_id:connection().locationId}));}
 transaction(()=>{if(before!==fingerprint())throw new Error('Settings changed during the connection check. Reload before enabling.');getDb().prepare('UPDATE counter_reward_settings SET enabled=?,variants_json=?,revision=revision+1 WHERE id=1').run(input.enabled?1:0,JSON.stringify(input.variants));audit('counter-trial',input.enabled?'counter-enabled':'counter-paused',actor,JSON.stringify(input.variants));});
 return counterStatus();
}
export function pauseCounter(actor:string){transaction(()=>{getDb().prepare('UPDATE counter_reward_settings SET enabled=0,revision=revision+1 WHERE id=1').run();audit('counter-trial','counter-paused',actor,'New stamps stopped; existing balances retained');});}
export async function previewCounter(input:{memberCode:string;date:string;number:string}){
 if(!counterAvailable())throw new Error('Counter earning is paused or its Yoco connection needs setup.');
 const stamp=fingerprint(),u=member(input.memberCode.trim().toUpperCase()),sale=await findCounterSale(input.date,input.number.trim()),result=eligible(sale,counterConfig().variants);
 if(stamp!==fingerprint())throw new Error('Counter settings changed. Check the receipt again.');
 const prior=getDb().prepare('SELECT user_id,credited FROM counter_reward_sales WHERE environment=? AND yoco_id=?').get(environment(),sale.id);
 if(prior)throw new Error('This Yoco sale has already been recorded, including any reversal. It cannot earn twice.');
 return {memberCode:input.memberCode.trim().toUpperCase(),email:u.email.replace(/^(.{2}).*(@.*)$/,'$1…$2'),date:input.date,number:sale.order_number,yocoId:sale.id,quantity:result.quantity,items:result.lines.filter(l=>counterConfig().variants.some(v=>v.id===l.variantId)),revision:counterConfig().revision,environment:environment()};
}
export async function awardCounter(input:{memberCode:string;date:string;number:string;yocoId:string;quantity:number;revision:number},actor:string){
 if(!counterAvailable())throw new Error('Counter earning is paused or its Yoco connection needs setup.');
 const before=fingerprint(),u=member(input.memberCode.trim().toUpperCase()),env=environment(),sale=await findCounterSale(input.date,input.number.trim()),c=counterConfig(),result=eligible(sale,c.variants);
 if(before!==fingerprint()||input.revision!==c.revision||sale.id!==input.yocoId||result.quantity!==input.quantity)throw new Error('The receipt or settings changed. Check the receipt again before adding stamps.');
 return transaction(()=>{
  member(input.memberCode.trim().toUpperCase());
  if(!counterAvailable()||before!==fingerprint())throw new Error('Counter earning has been paused. No stamps were added.');
  const existing=getDb().prepare('SELECT * FROM counter_reward_sales WHERE environment=? AND yoco_id=?').get(env,sale.id) as Entry|undefined;
  if(existing){if(existing.user_id===u.id&&existing.credited===result.quantity)return {id:existing.id,quantity:existing.credited,alreadyAdded:true};throw new Error('This sale was already recorded or reversed. It cannot earn twice.');}
  const id=randomUUID(),at=stampTime();
  getDb().prepare('INSERT INTO counter_reward_sales (id,environment,yoco_id,order_number,sale_date,location_id,user_id,batch,quantity,credited,snapshot_json,actor,created_at,checked_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,env,sale.id,sale.order_number,input.date,sale.location_id!,u.id,c.batch,result.quantity,result.quantity,JSON.stringify({lines:result.lines,variants:c.variants}),actor,at,at);
  audit(id,'counter-stamps-added',actor,JSON.stringify({quantity:result.quantity,order:sale.order_number,batch:c.batch}));reconcileBalance(u.id,env);return {id,quantity:result.quantity,alreadyAdded:false};
 });
}
function reasonRequired(reason:string){if(typeof reason!=='string'||reason.trim().length<5||reason.length>200)throw new Error('Give a reason of 5–200 characters.');}
function reverse(entry:Entry,actor:string,reason:string){if(!entry.credited)return;getDb().prepare('UPDATE counter_reward_sales SET credited=0,reversed_at=?,reason=? WHERE id=?').run(stampTime(),reason,entry.id);audit(entry.id,'counter-stamps-reversed',actor,reason);reconcileBalance(entry.user_id,entry.environment);}
export function reverseCounter(id:string,reason:string,actor:string){reasonRequired(reason);transaction(()=>{const row=getDb().prepare('SELECT * FROM counter_reward_sales WHERE id=?').get(id) as Entry|undefined;if(!row)throw new Error('Counter entry not found.');reverse(row,actor,reason);});}
export function rollbackCounter(reason:string,actor:string){reasonRequired(reason);return transaction(()=>{const db=getDb();db.prepare('UPDATE counter_reward_settings SET enabled=0,revision=revision+1,batch=? WHERE id=1').run(randomUUID());const rows=db.prepare('SELECT * FROM counter_reward_sales WHERE credited>0').all() as Entry[];for(const row of rows)reverse(row,actor,reason);audit('counter-trial','counter-rollback',actor,JSON.stringify({reason,entries:rows.length}));return {reversed:rows.length};});}

// Check retained counter credits even while earning is paused. A staff-board visit drives bounded batches.
export async function syncCounterRefunds(){
 const db=getDb();if(!db.prepare('UPDATE counter_reward_sync SET next_run=? WHERE id=1 AND next_run<=?').run(Date.now()+60000,Date.now()).changes)return;
 let config;try{config=connection();}catch{return;}
 const env:RewardEnvironment=config.environment==='live'?'live':'test';
 const rows=db.prepare('SELECT * FROM counter_reward_sales WHERE credited>0 AND environment=? AND location_id=? ORDER BY coalesce(checked_at,created_at) LIMIT 10').all(env,config.locationId) as Entry[];
 for(const entry of rows){
  try{
   const key=providerSecret('yoco-pos-key'),response=await fetch('https://'+(config.environment==='live'?'api.yoco.com':'api.yocosandbox.com')+'/v1/orders/'+encodeURIComponent(entry.yoco_id),{headers:{Authorization:'Bearer '+key},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('Yoco refund check failed; review this receipt.');
   const payload=await response.json(),sale=(payload.data??payload) as CounterSale;
   if(sale.id!==entry.yoco_id||sale.location_id!==entry.location_id)throw new Error('Yoco receipt identity could not be verified.');
   if(JSON.stringify(config)!==JSON.stringify(yocoPosConfig()))return;
   transaction(()=>{const current=db.prepare('SELECT * FROM counter_reward_sales WHERE id=?').get(entry.id) as Entry;
    if(refunded(sale)||['cancelled','refunded'].includes(sale.status))reverse(current,'yoco-refund-check','Yoco sale refunded, returned or cancelled');
    else {const original=JSON.parse(entry.snapshot_json);try{const currentSale=eligible(sale,original.variants);if(currentSale.quantity!==entry.quantity)reverse(current,'yoco-refund-check','Yoco qualifying coffee quantity changed');}catch{throw new Error('Yoco sale changed; administrator must review this receipt.');}}
    db.prepare('UPDATE counter_reward_sales SET checked_at=?,check_error=NULL WHERE id=?').run(stampTime(),entry.id);
   });
  }catch{db.prepare('UPDATE counter_reward_sales SET checked_at=?,check_error=? WHERE id=?').run(stampTime(),'Unable to verify this Yoco sale. Review the receipt; reverse stamps if refunded or changed.',entry.id);}
 }
}

