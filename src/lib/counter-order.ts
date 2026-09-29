import {getDb} from './db';
import {quoteCart,type CartLine,type Meal} from './menu';
import {member,counterAvailable,counterConfig,findCounterSale,eligibleCounterSale,counterFingerprint} from './counter-rewards';
import {customerCheckoutMode} from './payments';
import {randomUUID} from 'node:crypto';

export function lookupMembership(code:string){const u=member(code.trim().toUpperCase());return {code:code.trim().toUpperCase(),email:u.email.replace(/^(.{2}).*(@.*)$/,'$1…$2'),enabled:counterAvailable()};}
// Within createOrder's transaction. Identification never earns a stamp.
export function attachCounterMember(orderId:string,code:string,lines:CartLine[],menu:Meal[],environment:string){
 const u=member(code.trim().toUpperCase());
 const quantity=quoteCart(lines,menu).reduce((n,l)=>n+(menu.find(m=>m.id===l.id)?.category==='Coffee'&&l.subtotal>0?l.quantity:0),0);
 if(!quantity)throw new Error('Add a paid Coffee item before attaching a membership.');
 getDb().prepare('INSERT INTO counter_order_members (order_id,user_id,environment,quantity) VALUES (?,?,?,?)').run(orderId,u.id,environment,quantity);
 return u.id;
}
export function counterOrderSummary(orderId:string){return getDb().prepare(`SELECT m.quantity,m.environment,s.credited,s.reversed_at AS reversedAt,s.id AS saleId FROM counter_order_members m LEFT JOIN counter_reward_sales s ON s.id=m.sale_id WHERE m.order_id=?`).get(orderId) as {quantity:number;environment:string;credited:number|null;reversedAt:string|null;saleId:string|null}|undefined;}

// Fetch before the transaction, then recheck all bindings under the order write lock.
export async function prepareCounterOrderReceipt(orderId:string,number:string,date:string,actor:string){
 if(!counterAvailable())throw new Error('Counter rewards are paused or Yoco setup is incomplete. Membership is saved, but this receipt cannot earn yet.');
 const before=counterFingerprint(),sale=await findCounterSale(date,number.trim());
 return ()=>{
  if(!counterAvailable()||before!==counterFingerprint())throw new Error('Counter settings changed. Check the receipt again.');
  const db=getDb(),m=db.prepare('SELECT * FROM counter_order_members WHERE order_id=?').get(orderId) as {user_id:string;environment:string;quantity:number;sale_id:string|null}|undefined;
  if(!m)throw new Error('This order has no rewards membership.');
  if(m.environment!==(customerCheckoutMode()==='live'?'live':'test'))throw new Error('Order and Yoco payment environments differ.');
  if(!db.prepare('SELECT 1 FROM users WHERE id=? AND email_verified_at IS NOT NULL').get(m.user_id))throw new Error('The customer must verify their email.');
  const result=eligibleCounterSale(sale,counterConfig().variants,orderId);
  if(result.quantity!==m.quantity)throw new Error('The paid coffee quantity does not match this FOND order.');
  if(m.sale_id)throw new Error('This order already has a verified rewards receipt.');
  if(db.prepare('SELECT 1 FROM counter_reward_sales WHERE environment=? AND yoco_id=?').get(m.environment,sale.id))throw new Error('This receipt has already earned or been reserved for stamps.');
  const id=randomUUID(),at=new Date().toISOString(),config=counterConfig();
  db.prepare('INSERT INTO counter_reward_sales (id,environment,yoco_id,order_number,sale_date,location_id,user_id,batch,quantity,credited,snapshot_json,actor,created_at,checked_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,m.environment,sale.id,sale.order_number,date,sale.location_id!,m.user_id,config.batch,result.quantity,0,JSON.stringify({lines:result.lines,variants:config.variants,orderId}),actor,at,at);
  db.prepare('UPDATE counter_order_members SET sale_id=? WHERE order_id=?').run(id,orderId);
  db.prepare('INSERT INTO loyalty_events VALUES (?,?,?,?,?,?)').run(randomUUID(),id,'counter-receipt-linked',actor,orderId,at);
 };
}

export function skipCounterOrder(orderId:string,actor:string){
 const db=getDb();if(db.prepare('SELECT sale_id FROM counter_order_members WHERE order_id=?').get(orderId)?.sale_id)throw new Error('A verified rewards receipt cannot be removed here. Ask an administrator to reverse it.');
 db.prepare('DELETE FROM counter_order_members WHERE order_id=?').run(orderId);
 db.prepare('INSERT INTO loyalty_events VALUES (?,?,?,?,?,?)').run(randomUUID(),orderId,'counter-membership-removed',actor,'Staff continued this order without counter stamps',new Date().toISOString());
}
