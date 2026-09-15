import { onlinePaymentsConfigured } from '@/lib/payments';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE,isValidAdminToken } from '@/lib/admin-auth';
import { teamSession,listTeam,saveMember } from '@/lib/team';
import { document,saveDocument,settings,validateSettings,DEFAULT_CONTENT,validateContent,audit } from '@/lib/management';
import { customers,saveCustomer,customerHistory,importCustomerFromOrder,finance,recordPayment,csv } from '@/lib/business-data';
import { getDb } from '@/lib/db';
const headers={'Cache-Control':'no-store'};
type Context={params:Promise<{section:string}>};
async function actor(){const token=(await cookies()).get(ADMIN_COOKIE)?.value;return isValidAdminToken(token)?(teamSession(token)?'team:'+teamSession(token)!.id:'shared-admin'):null;}
function failure(e:unknown){return Response.json({message:e instanceof Error&& !/SQLITE|constraint/i.test(e.message)?e.message:'Could not save. Check for a duplicate username, phone number or reference.'},{status:400,headers});}
export async function GET(request:Request,context:Context){
  if(!await actor())return Response.json({message:'Admin access required.'},{status:401,headers});
  const {section}=await context.params,u=new URL(request.url);
  try{
    if(section==='settings')return Response.json({settings:settings(),team:listTeam(),providers:{yoco:onlinePaymentsConfigured(),whatsapp:!!process.env.FOND_WHATSAPP_TOKEN&&!!process.env.FOND_WHATSAPP_PHONE_NUMBER_ID},audit:getDb().prepare('SELECT * FROM admin_events ORDER BY created_at DESC LIMIT 100').all()}, {headers});
    if(section==='customers'){
      const rows=customers(u.searchParams.get('q')??'');
      if(u.searchParams.get('export')==='consented')return new Response(csv((rows as Record<string,unknown>[]).filter(r=>r.marketing_consent===1&&r.archived===0)),{headers:{...headers,'Content-Type':'text/csv','Content-Disposition':'attachment; filename="fond-consented-customers.csv"'}});
      return Response.json({customers:rows,history:u.searchParams.has('id')?customerHistory(u.searchParams.get('id')!):[],recentOrders:getDb().prepare('SELECT id,reference,customer_name,contact_number,created_at FROM orders ORDER BY created_at DESC LIMIT 100').all()},{headers});
    }
    if(section==='marketing')return Response.json({draft:document('content-draft',DEFAULT_CONTENT),published:document('content-published',DEFAULT_CONTENT),jobs:getDb().prepare('SELECT id,order_id,template,status,attempts,last_error,updated_at FROM notification_jobs ORDER BY updated_at DESC LIMIT 100').all()},{headers});
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
    if(section==='settings')saveDocument('trading',validateSettings(b),who);
    else if(section==='team')saveMember(b,who);
    else if(section==='customers'){if(b.orderId)importCustomerFromOrder(b.orderId,who);else saveCustomer(b,who);}
    else if(section==='marketing'){
      const content=validateContent(b.content);saveDocument('content-draft',content,who);
      if(b.publish===true){saveDocument('content-previous',document('content-published',DEFAULT_CONTENT),who);saveDocument('content-published',content,who);}
    }
    else if(section==='restore-content')saveDocument('content-published',document('content-previous',DEFAULT_CONTENT),who);
    else if(section==='finance')recordPayment(b,who);
    else if(section==='notification-retry'){
      getDb().prepare("UPDATE notification_jobs SET status='pending',next_at=0 WHERE id=? AND status IN ('failed','not-configured')").run(b.id);audit(who,'notification-retry',b.id);
    }
    else return Response.json({message:'Unknown section.'},{status:404,headers});
    return Response.json({ok:true},{headers});
  }catch(e){return failure(e);}
}
