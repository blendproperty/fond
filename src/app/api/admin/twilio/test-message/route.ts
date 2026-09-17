import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {audit,normalizePhone} from '@/lib/management';
import {validRequestOrigin} from '@/lib/request-origin';
import {sendWhatsAppNotification,whatsappConfigured} from '@/lib/whatsapp';

const headers={'Cache-Control':'no-store'};

export async function POST(request:Request){
 const token=(await cookies()).get(ADMIN_COOKIE)?.value;
 if(adminRole(token)!=='super-admin')return Response.json({message:'Super admin access required.'},{status:403,headers});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 if(!whatsappConfigured())return Response.json({message:'Store a valid Meta Cloud API or Twilio WhatsApp configuration first.'},{status:400,headers});
 const body=await request.json().catch(()=>null) as {to?:unknown;template?:unknown}|null;
 if(!body||typeof body.to!=='string'||!['order_accepted','order_ready'].includes(String(body.template)))return Response.json({message:'Enter a recipient and choose a test message.'},{status:400,headers});
 try{
  const template=body.template as 'order_accepted'|'order_ready';
  const result=await sendWhatsAppNotification({toE164:normalizePhone(body.to),templateName:template,customerName:'Brett',reference:'FOND-WHATSAPP-TEST'});
  audit('super-admin','whatsapp-test',template);
  if(!result.sent)return Response.json({message:`WhatsApp provider did not accept the message (${result.reason??'unknown error'}). Check the sender, template approval and provider log.`},{status:502,headers});
  return Response.json({ok:true,message:'WhatsApp provider accepted the test message. Confirm delivery on the recipient phone and in the provider log.'},{headers});
 }catch(error){return Response.json({message:error instanceof Error?error.message:'Could not send the WhatsApp test.'},{status:400,headers});}
}
