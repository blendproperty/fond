import { createHmac,timingSafeEqual,randomUUID } from 'node:crypto';
import { getDb } from './db';
import { settings } from './management';
import {providerSecret} from './provider-secrets';
import {publicBaseUrl} from './public-url';
const yocoKey=()=>providerSecret('yoco-secret')??process.env.YOCO_SECRET_KEY;
const webhookKey=()=>providerSecret('yoco-webhook')??process.env.YOCO_WEBHOOK_SECRET;
export function onlinePaymentsConfigured(){
  try {
    const key=yocoKey();
    return !!key && (key.startsWith("sk_live_") || ((settings().allowTestPayments||process.env.FOND_ALLOW_TEST_PAYMENTS === "true") && key.startsWith("sk_test_"))) && !!webhookKey() && !!publicBaseUrl();
  } catch { return false; }
}
export function paymentStatus(orderId:string){
  const paid=(getDb().prepare('SELECT coalesce(sum(amount_cents),0) AS n FROM payment_records WHERE order_id=?').get(orderId) as {n:number}).n;
  const checkout=getDb().prepare('SELECT status,updated_at FROM yoco_checkouts WHERE order_id=?').get(orderId) as {status:string;updated_at:string}|undefined;
  return {paidCents:paid,checkout:checkout?.status??null,checkoutUpdatedAt:checkout?.updated_at??null};
}
export function yocoCredentialMode(){try{const key=yocoKey();return key?.startsWith('sk_test_')?'test':key?.startsWith('sk_live_')?'live':'none';}catch{return 'none';}}
export async function createCheckout(reference:string,options:{allowSandbox?:boolean}={}){
  const s=settings(),mode=yocoCredentialMode();
  const allowed=options.allowSandbox
    ? mode==='test'&&s.allowTestPayments&&!!yocoKey()&&!!publicBaseUrl()
    : mode==='live'&&s.onlinePaymentsEnabled&&onlinePaymentsConfigured();
  if(!allowed)throw new Error('Online payment is not available. Please pay at FOND.');
  const db=getDb();const order=db.prepare('SELECT id,total_cents,status FROM orders WHERE reference=?').get(reference) as {id:string;total_cents:number;status:string}|undefined;
  if(!order||order.status==='cancelled')throw new Error('Order unavailable.');
  if(paymentStatus(order.id).paidCents>0)throw new Error('A payment is already recorded. Contact FOND for the remaining balance.');
  const prior=db.prepare('SELECT redirect_url,status,updated_at FROM yoco_checkouts WHERE order_id=?').get(order.id) as {redirect_url:string;status:string;updated_at:string}|undefined;
  if(prior?.status==='paid')throw new Error('This order is already paid.');
  if(prior?.redirect_url)return prior.redirect_url;
  if(prior && Date.now()-Date.parse(prior.updated_at)>3600000)throw new Error("Checkout needs reconciliation with Yoco. Contact FOND before retrying payment.");
  const publicUrl=publicBaseUrl();if(!publicUrl)throw new Error('Online payment requires a secure site URL.');const base=new URL(publicUrl);
  db.prepare("INSERT OR IGNORE INTO yoco_checkouts VALUES (?,NULL,NULL,'creating',?)").run(order.id,new Date().toISOString());
  const response=await fetch('https://payments.yoco.com/api/checkouts',{
    method:'POST',headers:{Authorization:`Bearer ${yocoKey()}`,'Content-Type':'application/json','Idempotency-Key':order.id},signal:AbortSignal.timeout(20000),
    body:JSON.stringify({amount:order.total_cents,currency:'ZAR',metadata:{fondOrderId:order.id},externalId:order.id,successUrl:`${base.origin}/?payment=return&reference=${encodeURIComponent(reference)}`,cancelUrl:`${base.origin}/?payment=cancelled&reference=${encodeURIComponent(reference)}`,failureUrl:`${base.origin}/?payment=failed&reference=${encodeURIComponent(reference)}`})
  });
  if(!response.ok)throw new Error('Yoco could not start checkout. Retry the same order or contact FOND.');
  const result=await response.json();const url=new URL(result.redirectUrl);
  if(typeof result.id!=='string'||url.protocol!=='https:'||!(url.hostname==='yoco.com'||url.hostname.endsWith('.yoco.com')))throw new Error('Invalid checkout response.');
  db.prepare("UPDATE yoco_checkouts SET checkout_id=?,redirect_url=?,status=CASE WHEN status='paid' THEN status ELSE 'pending' END,updated_at=? WHERE order_id=?").run(result.id,url.toString(),new Date().toISOString(),order.id);
  return url.toString();
}
export function verifyYocoSignature(raw:string,headers:Headers,now=Date.now()){
  const secret=webhookKey(),id=headers.get('webhook-id'),timestamp=headers.get('webhook-timestamp'),signature=headers.get('webhook-signature');
  if(!secret?.startsWith('whsec_')||!id||!timestamp||!/^\d+$/.test(timestamp)||!signature||Math.abs(now/1000-Number(timestamp))>180)return false;
  const expected=createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${timestamp}.${raw}`).digest();
  return signature.split(' ').some(s=>{const [version,value]=s.split(',');if(version!=='v1'||!value)return false;const actual=Buffer.from(value,'base64');return actual.length===expected.length&&timingSafeEqual(actual,expected);});
}
export function processPaymentEvent(event:{id:string;type:string;payload:{id:string;status:string;amount:number;currency:string;mode:string;metadata?:{checkoutId?:string}}}){
  if(typeof event.id!=='string'||!event.payload)throw new Error('Invalid event.');
  if(!['payment.succeeded','refund.succeeded'].includes(event.type))return {ignored:true};
  const refund=event.type==='refund.succeeded';
  const p=event.payload,db=getDb();db.exec('BEGIN IMMEDIATE');
  try{
    if(db.prepare('SELECT id FROM webhook_receipts WHERE id=?').get(event.id)){db.exec('COMMIT');return {duplicate:true};}
    const checkout=db.prepare('SELECT c.order_id,o.total_cents FROM yoco_checkouts c JOIN orders o ON o.id=c.order_id WHERE c.checkout_id=?').get(p.metadata?.checkoutId??'') as {order_id:string;total_cents:number}|undefined;
    const expectedMode=yocoKey()?.startsWith('sk_test_')?'test':'live';
    if(expectedMode==='test'&&!settings().allowTestPayments&&process.env.FOND_ALLOW_TEST_PAYMENTS!=='true')throw new Error('Sandbox payment processing is disabled.');
    if(!checkout||p.currency!=='ZAR'||p.status!=='succeeded'||(!Number.isSafeInteger(p.amount)||p.amount<=0||(!refund&&p.amount!==checkout.total_cents)||p.amount>checkout.total_cents)||p.mode!==expectedMode||typeof p.id!=='string')throw new Error('Payment does not match the stored checkout.');
    const reference=(refund?'yoco-refund:':'yoco:')+p.id;
    if(!db.prepare('SELECT id FROM payment_records WHERE reference=?').get(reference)){
      const paid=paymentStatus(checkout.order_id).paidCents;
      if((refund&&paid<p.amount)||(!refund&&paid>0))throw new Error('Payment balance requires reconciliation.');
      db.prepare('INSERT INTO payment_records VALUES (?,?,?,?,?,?,?)').run(randomUUID(),checkout.order_id,refund?-p.amount:p.amount,refund?'yoco-refund':'yoco',reference,'yoco-webhook',new Date().toISOString());
    }
    db.prepare("UPDATE yoco_checkouts SET status='paid',updated_at=? WHERE order_id=?").run(new Date().toISOString(),checkout.order_id);
    db.prepare('INSERT INTO webhook_receipts VALUES (?,?)').run(event.id,new Date().toISOString());db.exec('COMMIT');return {ok:true};
  }catch(e){db.exec('ROLLBACK');throw e;}
}
