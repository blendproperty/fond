import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {audit,normalizePhone} from '@/lib/management';
import {validRequestOrigin} from '@/lib/request-origin';
import {sendSmsNotification,smsConfigured} from '@/lib/sms';

const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 const token=(await cookies()).get(ADMIN_COOKIE)?.value;
 if(adminRole(token)!=='super-admin')return Response.json({message:'Super admin access required.'},{status:403,headers});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 if(!smsConfigured())return Response.json({message:'Store a valid Twilio SMS configuration and auth token first.'},{status:400,headers});
 const body=await request.json().catch(()=>null) as {to?:unknown;template?:unknown}|null;
 if(!body||typeof body.to!=='string'||!['order_accepted','order_ready'].includes(String(body.template)))return Response.json({message:'Enter a recipient and choose a test message.'},{status:400,headers});
 try{
  const template=body.template as 'order_accepted'|'order_ready';
  const result=await sendSmsNotification({toE164:normalizePhone(body.to),templateName:template,reference:'FOND-SMS-TEST',statusCallback:false});
  audit('super-admin','sms-test',template);
  if(!result.sent)return Response.json({message:`Twilio did not accept the SMS (${result.reason??'unknown error'}). Check the Twilio message log.`},{status:502,headers});
  return Response.json({ok:true,providerId:result.providerId,message:`Twilio accepted the SMS (${result.providerStatus}). Confirm delivery on the recipient phone and in the Twilio message log.`},{headers});
 }catch(error){return Response.json({message:error instanceof Error?error.message:'Could not send the SMS test.'},{status:400,headers});}
}
