import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { audit, normalizePhone } from './management';
export type Customer={id:string;name:string;phone:string|null;email:string|null;company:string|null;notes:string;marketing_consent:number;consent_note:string;archived:number;updated_at:string};
export function saveCustomer(c:Partial<Customer>,actor:string){
  if(typeof c.name!=='string'||!c.name.trim()||c.name.length>100)throw new Error('Enter a customer name.');
  for(const key of ['email','company','notes','consent_note'] as const)if(c[key]!=null&&(typeof c[key]!=='string'||c[key]!.length>(key==='notes'?2000:250)))throw new Error('Customer field is too long.');
  if(c.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))throw new Error('Enter a valid email address.');
  if(c.marketing_consent&&!c.consent_note?.trim())throw new Error('Record when and how this customer consented to marketing. Order notifications are not marketing consent.');
  const id=c.id??randomUUID(),phone=c.phone?normalizePhone(c.phone):null;
  if(c.id&&!getDb().prepare('SELECT id FROM customers WHERE id=?').get(c.id))throw new Error('Customer not found.');
  getDb().prepare(`INSERT INTO customers VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,email=excluded.email,company=excluded.company,notes=excluded.notes,marketing_consent=excluded.marketing_consent,consent_note=excluded.consent_note,archived=excluded.archived,updated_at=excluded.updated_at`).run(id,c.name.trim(),phone,c.email?.trim()||null,c.company?.trim()||null,c.notes??'',c.marketing_consent?1:0,c.consent_note??'',c.archived?1:0,new Date().toISOString());
  audit(actor,'customer-update',id);return id;
}
export function customers(q='') {
  return getDb().prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR company LIKE ? ORDER BY archived,name LIMIT 500').all(...Array(4).fill('%'+q.slice(0,100)+'%'));
}
export function customerHistory(id:string){
  const c=getDb().prepare('SELECT * FROM customers WHERE id=?').get(id) as Customer|undefined;
  if(!c)throw new Error('Customer not found.');
  const rows=getDb().prepare('SELECT id,reference,customer_name,contact_number,total_cents,status,created_at FROM orders WHERE contact_number IS NOT NULL ORDER BY created_at DESC').all() as {contact_number:string}[];
  return rows.filter(r=>{try{return !!c.phone&&normalizePhone(r.contact_number)===c.phone;}catch{return false;}}).slice(0,200);
}
export function importCustomerFromOrder(orderId:string,actor:string){
  const o=getDb().prepare('SELECT customer_name,contact_number,company FROM orders WHERE id=?').get(orderId) as {customer_name:string;contact_number:string;company:string}|undefined;
  if(!o)throw new Error('Order not found.');
  const phone=o.contact_number?normalizePhone(o.contact_number):null;
  if(phone){const existing=getDb().prepare('SELECT id FROM customers WHERE phone=?').get(phone) as {id:string}|undefined;if(existing)return existing.id;}
  return saveCustomer({name:o.customer_name,phone,company:o.company},actor);
}
export function recordPayment(input:{orderId:string;amountCents:number;method:string;reference:string},actor:string){
  if(!['cash','card','eft','refund'].includes(input.method)||!Number.isSafeInteger(input.amountCents)||input.amountCents<=0||typeof input.reference!=='string'||!input.reference.trim()||input.reference.length>150)throw new Error('Provide payment method, positive amount and a unique receipt/reference.');
  const db=getDb();db.exec('BEGIN IMMEDIATE');
  try{
    const o=db.prepare('SELECT total_cents,status FROM orders WHERE id=?').get(input.orderId) as {total_cents:number;status:string}|undefined;
    if(!o)throw new Error('Order not found.');
    const prior=db.prepare('SELECT * FROM payment_records WHERE reference=?').get(input.reference.trim()) as {order_id:string;amount_cents:number;method:string}|undefined;
    const amount=input.method==='refund'?-input.amountCents:input.amountCents;
    if(prior){if(prior.order_id!==input.orderId||prior.amount_cents!==amount||prior.method!==input.method)throw new Error('Reference already used.');db.exec('COMMIT');return;}
    const paid=(db.prepare('SELECT coalesce(sum(amount_cents),0) AS n FROM payment_records WHERE order_id=?').get(input.orderId) as {n:number}).n;
    if(paid+amount<0||paid+amount>o.total_cents)throw new Error('Amount exceeds the outstanding balance or refundable amount.');
    if(o.status==='cancelled'&&amount>0)throw new Error('Cannot record payment against a cancelled order.');
    const pending=db.prepare("SELECT status FROM yoco_checkouts WHERE order_id=? AND status IN ('creating','pending')").get(input.orderId);
    if(pending&&amount>0)throw new Error('Online checkout is pending. Reconcile it before recording another payment.');
    db.prepare('INSERT INTO payment_records VALUES (?,?,?,?,?,?,?)').run(randomUUID(),input.orderId,amount,input.method,input.reference.trim(),actor,new Date().toISOString());
    audit(actor,input.method==='refund'?'refund-recorded':'payment-recorded',input.orderId);db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
}
export function finance(from:string,to:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to)throw new Error('Choose a valid date range.');
  const db=getDb();
  const orders=db.prepare(`SELECT o.id,o.reference,o.customer_name,o.total_cents,o.status,o.created_at,coalesce(sum(p.amount_cents),0) AS paid_cents FROM orders o LEFT JOIN payment_records p ON p.order_id=o.id WHERE date(o.created_at,'+2 hours') BETWEEN ? AND ? GROUP BY o.id ORDER BY o.created_at DESC`).all(from,to) as {id:string;total_cents:number;paid_cents:number;status:string}[];
  const payments=db.prepare(`SELECT p.*,o.reference AS order_reference FROM payment_records p JOIN orders o ON o.id=p.order_id WHERE date(p.created_at,'+2 hours') BETWEEN ? AND ? ORDER BY p.created_at DESC`).all(from,to) as {amount_cents:number}[];
  const checkouts=db.prepare('SELECT c.order_id,c.checkout_id,c.status,c.updated_at,o.reference FROM yoco_checkouts c JOIN orders o ON o.id=c.order_id ORDER BY c.updated_at DESC LIMIT 100').all();
  return {orders,payments,checkouts,summary:{orderCount:orders.length,orderValue:orders.filter(o=>o.status!=='cancelled').reduce((n,o)=>n+o.total_cents,0),netReceipts:payments.reduce((n,p)=>n+p.amount_cents,0),outstanding:orders.filter(o=>o.status!=='cancelled').reduce((n,o)=>n+Math.max(0,o.total_cents-o.paid_cents),0),refundDue:orders.filter(o=>o.status==='cancelled').reduce((n,o)=>n+Math.max(0,o.paid_cents),0)}};
}
export function csv(rows:Record<string,unknown>[]){
  const keys=Object.keys(rows[0]??{});const cell=(v:unknown)=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  return [keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');
}
