import { onlinePaymentsConfigured } from '@/lib/payments';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE,isValidAdminToken,adminRole } from '@/lib/admin-auth';
import { teamSession,listTeam,saveMember } from '@/lib/team';
import { document,saveDocument,settings,validateSettings,DEFAULT_CONTENT,validateContent,audit } from '@/lib/management';
import { customers,saveCustomer,customerHistory,importCustomerFromOrder,finance,recordPayment,csv } from '@/lib/business-data';
import { getDb } from '@/lib/db';
import { deliverOrderEmail } from '@/lib/email';
import { getOrderByReference } from '@/lib/orders';
import { whatsappConfigured } from '@/lib/whatsapp';
import {smsConfigured} from '@/lib/sms';
import {DEFAULT_MESSAGE_TEMPLATES,validateMessageTemplates} from '@/lib/message-template-config';
const headers={'Cache-Control':'no-store'};
type Context={params:Promise<{section:string}>};
async function actor(){const token=(await cookies()).get(ADMIN_COOKIE)?.value;return isValidAdminToken(token)?(teamSession(token)?'team:'+teamSession(token)!.id:'shared-admin'):null;}
async function role(){return adminRole((await cookies()).get(ADMIN_COOKIE)?.value);}
function failure(e:unknown){return Response.json({message:e instanceof Error&& !/SQLITE|constraint/i.test(e.message)?e.message:'Could not save. Check for a duplicate username, phone number or reference.'},{status:400,headers});}
export async function GET(request:Request,context:Context){
  if(!await actor())return Response.json({message:'Admin access required.'},{status:401,headers});
  const {section}=await context.params,u=new URL(request.url);
  try{
    if(section==='settings')return Response.json({settings:settings(),team:(await role())==='super-admin'?listTeam():[],role:await role(),providers:{yoco:onlinePaymentsConfigured(),whatsapp:whatsappConfigured(),sms:smsConfigured()},audit:(await role())==='super-admin'?getDb().prepare('SELECT * FROM admin_events ORDER BY created_at DESC LIMIT 100').all():[]}, {headers});
    if(section==='customers'){
      const rows=customers(u.searchParams.get('q')??'');
      if(u.searchParams.get('export')==='consented')return new Response(csv((rows as Record<string,unknown>[]).filter(r=>r.marketing_consent===1&&r.archived===0)),{headers:{...headers,'Content-Type':'text/csv','Content-Disposition':'attachment; filename="fond-consented-customers.csv"'}});
      return Response.json({customers:rows,history:u.searchParams.has('id')?customerHistory(u.searchParams.get('id')!):[],recentOrders:getDb().prepare('SELECT id,reference,customer_name,contact_number,created_at FROM orders ORDER BY created_at DESC LIMIT 100').all()},{headers});
    }
    if(section==='marketing')return Response.json({draft:document('content-draft',DEFAULT_CONTENT),published:document('content-published',DEFAULT_CONTENT),messageDraft:validateMessageTemplates(document('message-templates-draft',DEFAULT_MESSAGE_TEMPLATES)),messagePublished:validateMessageTemplates(document('message-templates-published',DEFAULT_MESSAGE_TEMPLATES)),jobs:getDb().prepare('SELECT id,order_id,template,status,attempts,last_error,updated_at FROM notification_jobs ORDER BY updated_at DESC LIMIT 100').all(),smsJobs:getDb().prepare('SELECT id,order_id,template,status,attempts,provider_id,last_error,updated_at FROM sms_jobs ORDER BY updated_at DESC LIMIT 100').all(),emailJobs:getDb().prepare('SELECT id,event,recipient,status,error,updated_at FROM email_jobs ORDER BY updated_at DESC LIMIT 100').all()},{headers});
    if(section==='finance'){
      const result=finance(u.searchParams.get('from')??new Date().toISOString().slice(0,10),u.searchParams.get('to')??new Date().toISOString().slice(0,10));
      if(u.searchParams.has('export'))return new Response(csv(result.payments as Record<string,unknown>[]),{headers:{...headers,'Content-Type':'text/csv','Content-Disposition':'attachment; filename="fond-payment-ledger.csv"'}});
      return Response.json(result,{headers});
    }
    if(section==='history')return Response.json({events:getDb().prepare('SELECT * FROM order_events WHERE order_id=? ORDER BY rowid').all(u.searchParams.get('id')??'')},{headers});
    return Response.json({message:'Unknown section.'},{status:404,headers});
  }catch(e){return failure(e);}
}
export async function POST(request:Request,context:Context){
  const who=await actor();if(!who)return Response.json({message:'Admin access required.'},{status:401,headers});
  const {section}=await context.params;const b=await request.json().catch(()=>null);
  if(!b||typeof b!=='object')return Response.json({message:'Invalid request.'},{status:400,headers});
  try{
    if(section==='settings'){
      const next=validateSettings(b),prior=settings();
      if((await role())!=='super-admin'&&(next.onlinePaymentsEnabled!==prior.onlinePaymentsEnabled||next.allowTestPayments!==prior.allowTestPayments||next.whatsappEnabled!==prior.whatsappEnabled||next.smsEnabled!==prior.smsEnabled))return Response.json({message:'Super admin access is required to change provider switches.'},{status:403,headers});
      saveDocument('trading',next,who);
    }
    else if(section==='team'){
      if((await role())!=='super-admin')return Response.json({message:'Super admin access required.'},{status:403,headers});
      saveMember(b,who==='shared-admin'?who:who.replace('team:','super:'));
    }
    else if(section==='customers'){if(b.orderId)importCustomerFromOrder(b.orderId,who);else saveCustomer(b,who);}
    else if(section==='marketing'){
      const content=validateContent(b.content);saveDocument('content-draft',content,who);
      if(b.publish===true){saveDocument('content-previous',document('content-published',DEFAULT_CONTENT),who);saveDocument('content-published',content,who);}
    }
    else if(section==='message-templates'){
      if(b.restore===true){saveDocument('message-templates-published',document('message-templates-previous',DEFAULT_MESSAGE_TEMPLATES),who);}
      else{
        const content=validateMessageTemplates(b.content);saveDocument('message-templates-draft',content,who);
        if(b.publish===true){saveDocument('message-templates-previous',document('message-templates-published',DEFAULT_MESSAGE_TEMPLATES),who);saveDocument('message-templates-published',content,who);}
      }
    }
    else if(section==='restore-content')saveDocument('content-published',document('content-previous',DEFAULT_CONTENT),who);
    else if(section==='finance')recordPayment(b,who);
    else if(section==='notification-retry'){
      getDb().prepare("UPDATE notification_jobs SET status='pending',next_at=0 WHERE id=? AND status IN ('failed','not-configured')").run(b.id);audit(who,'notification-retry',b.id);
    }
    else if(section==='sms-retry'){
      getDb().prepare("UPDATE sms_jobs SET status='pending',provider_id=NULL,next_at=0 WHERE id=? AND status IN ('failed','undelivered','not-configured')").run(b.id);audit(who,'sms-retry',b.id);
    }
    else if(section==='email-retry'){
      if(typeof b.id!=='string')throw new Error('Choose a message to retry.');
      const job=getDb().prepare('SELECT id,order_id,event,status FROM email_jobs WHERE id=?').get(b.id) as {id:string;order_id:string;event:string;status:string}|undefined;
      if(!job||!['failed','pending'].includes(job.status))throw new Error('Only failed or pending email can be retried.');
      const row=getDb().prepare('SELECT reference FROM orders WHERE id=?').get(job.order_id) as {reference:string}|undefined;
      const order=row?getOrderByReference(row.reference):null;
      if(!order||!['received','accepted','ready','completed'].includes(job.event))throw new Error('Order unavailable.');
      const sent=await deliverOrderEmail(order,job.event as 'received'|'accepted'|'ready'|'completed');
      if(!sent)throw new Error('Email was not sent. Check the verified address and Resend configuration.');
      audit(who,'email-retry',job.id);
    }
    else return Response.json({message:'Unknown section.'},{status:404,headers});
    return Response.json({ok:true},{headers});
  }catch(e){return failure(e);}
}
