import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {sendControlledEmailTest,emailConfigured} from '@/lib/email';
import {audit} from '@/lib/management';
import {validRequestOrigin} from '@/lib/request-origin';

const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 const token=(await cookies()).get(ADMIN_COOKIE)?.value;
 if(adminRole(token)!=='super-admin')return Response.json({message:'Super admin access required.'},{status:403,headers});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 if(!emailConfigured())return Response.json({message:'Store a valid Resend API key and verified sender first.'},{status:400,headers});
 const body=await request.json().catch(()=>null) as {to?:unknown}|null;
 if(!body||typeof body.to!=='string')return Response.json({message:'Enter a test recipient email address.'},{status:400,headers});
 try{
  const result=await sendControlledEmailTest(body.to);
  audit('super-admin','email-test','provider-check');
  return Response.json({ok:true,providerId:result.providerId,message:'Resend accepted the FOND test email. Confirm delivery in the recipient mailbox and Resend log.'},{headers});
 }catch(error){return Response.json({message:error instanceof Error?error.message:'Could not send the email test.'},{status:400,headers});}
}
