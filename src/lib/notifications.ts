import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { settings,normalizePhone } from './management';
import { sendWhatsAppNotification } from './whatsapp';
import {sendSmsNotification} from './sms';
export function enqueueNotification(orderId:string,status:string){
  if(!['accepted','ready'].includes(status))return;
  const db=getDb(),o=db.prepare('SELECT whatsapp_opt_in,sms_opt_in,contact_number FROM orders WHERE id=?').get(orderId) as {whatsapp_opt_in:number;sms_opt_in:number;contact_number:string|null}|undefined;
  if(!o?.contact_number)return;
  const template='order_'+status,now=new Date().toISOString();
  if(o.whatsapp_opt_in)db.prepare("INSERT OR IGNORE INTO notification_jobs VALUES (?,?,?,'pending',0,NULL,?,?)").run(randomUUID(),orderId,template,Date.now(),now);
  if(o.sms_opt_in)db.prepare("INSERT OR IGNORE INTO sms_jobs VALUES (?,?,?,'pending',0,NULL,NULL,?,?)").run(randomUUID(),orderId,template,Date.now(),now);
}
// Staff polling drives this durable queue. No separate background process required.
export async function processNotifications(){
  const flags=settings(),db=getDb(),now=Date.now();
  if(flags.whatsappEnabled){const jobs=db.prepare("SELECT j.*,o.customer_name,o.reference,o.contact_number,o.status AS order_status FROM notification_jobs j JOIN orders o ON o.id=j.order_id WHERE j.status='pending' AND j.next_at<=? ORDER BY j.next_at LIMIT 3").all(now) as {id:string;attempts:number;template:'order_accepted'|'order_ready';customer_name:string;reference:string;contact_number:string;order_status:string}[];
  for(const j of jobs){
    const claim=db.prepare("UPDATE notification_jobs SET status='sending',attempts=attempts+1,updated_at=? WHERE id=? AND status='pending'").run(new Date().toISOString(),j.id);
    if(!claim.changes)continue;
    if(['completed','cancelled'].includes(j.order_status)||(j.template==='order_accepted'&&j.order_status==='ready')){db.prepare("UPDATE notification_jobs SET status='superseded' WHERE id=?").run(j.id);continue;}
    let result:{sent:boolean;reason?:string};
    try{result=await sendWhatsAppNotification({toE164:normalizePhone(j.contact_number),templateName:j.template,customerName:j.customer_name,reference:j.reference});}catch{result={sent:false,reason:'INVALID_PHONE'};}
    const status=result.sent?'provider-accepted':result.reason==='NOT_CONFIGURED'?'not-configured':result.reason==='NETWORK_ERROR'?'unknown':result.reason==='INVALID_PHONE'?'failed':j.attempts>=4?'failed':'pending';
    db.prepare('UPDATE notification_jobs SET status=?,last_error=?,next_at=?,updated_at=? WHERE id=?').run(status,result.reason??null,Date.now()+60000*2**j.attempts,new Date().toISOString(),j.id);
  }
  // An interrupted network send is ambiguous: require human reconciliation, not an automatic duplicate.
  db.prepare("UPDATE notification_jobs SET status='unknown',last_error='Interrupted send; check provider before retrying' WHERE status='sending' AND updated_at<?").run(new Date(now-120000).toISOString());
  }
  if(flags.smsEnabled){const jobs=db.prepare("SELECT j.*,o.customer_name,o.reference,o.contact_number,o.fulfillment,o.status AS order_status FROM sms_jobs j JOIN orders o ON o.id=j.order_id WHERE j.status='pending' AND j.next_at<=? ORDER BY j.next_at LIMIT 3").all(now) as {id:string;attempts:number;template:'order_accepted'|'order_ready';customer_name:string;reference:string;contact_number:string;fulfillment:'collection'|'delivery';order_status:string}[];
  for(const j of jobs){
    const claim=db.prepare("UPDATE sms_jobs SET status='sending',attempts=attempts+1,updated_at=? WHERE id=? AND status='pending'").run(new Date().toISOString(),j.id);if(!claim.changes)continue;
    if(['completed','cancelled'].includes(j.order_status)||(j.template==='order_accepted'&&j.order_status==='ready')){db.prepare("UPDATE sms_jobs SET status='superseded',updated_at=? WHERE id=?").run(new Date().toISOString(),j.id);continue;}
    let result:Awaited<ReturnType<typeof sendSmsNotification>>;
    try{result=await sendSmsNotification({toE164:normalizePhone(j.contact_number),templateName:j.template,reference:j.reference,customerName:j.customer_name,fulfillment:j.fulfillment});}catch{result={sent:false,reason:'INVALID_PHONE'};}
    const status=result.sent?(result.providerStatus??'provider-accepted'):result.reason==='NOT_CONFIGURED'?'not-configured':result.reason==='NETWORK_ERROR'?'unknown':result.reason==='INVALID_PHONE'?'failed':j.attempts>=4?'failed':'pending';
    db.prepare('UPDATE sms_jobs SET status=?,provider_id=?,last_error=?,next_at=?,updated_at=? WHERE id=?').run(status,result.sent?result.providerId:null,result.sent?null:result.reason,Date.now()+60000*2**j.attempts,new Date().toISOString(),j.id);
  }
  db.prepare("UPDATE sms_jobs SET status='unknown',last_error='Interrupted send; check Twilio before retrying' WHERE status='sending' AND updated_at<?").run(new Date(now-120000).toISOString());
  }
}
