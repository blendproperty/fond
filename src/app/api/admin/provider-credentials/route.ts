import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {providerSecretStatus,saveProviderSecret,type ProviderName} from '@/lib/provider-secrets';
import {teamSession} from '@/lib/team';
import {emailSender} from '@/lib/email';
import {saveDocument} from '@/lib/management';
import {twilioConfig,validateTwilioConfig} from '@/lib/whatsapp';
const names:ProviderName[]=['yoco-secret','yoco-webhook','email-api','staff-shared-code','twilio-auth-token'];
const noStore={'Cache-Control':'no-store'};
async function actor(){const token=(await cookies()).get(ADMIN_COOKIE)?.value;if(adminRole(token)!=='super-admin')return null;const member=teamSession(token);return member?'super:'+member.id:'shared-admin';}
export async function GET(){if(!await actor())return Response.json({message:'Super admin access required.'},{status:403,headers:noStore});return Response.json({configured:Object.fromEntries(names.map(n=>[n,providerSecretStatus(n)])),vaultReady:/^[a-f0-9]{64}$/i.test(process.env.FOND_CREDENTIALS_KEY??''),emailFrom:emailSender(),twilio:twilioConfig()},{headers:noStore});}
export async function POST(request:Request){const who=await actor();if(!who)return Response.json({message:'Super admin access required.'},{status:403,headers:noStore});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({message:'Invalid origin.'},{status:403,headers:noStore});
 const b=await request.json().catch(()=>null);if(!b)return Response.json({message:'Invalid setting.'},{status:400,headers:noStore});
 try{
  if(b.name==='twilio-config')saveDocument('twilio-config',validateTwilioConfig(b.value),who);
  else if(typeof b.value!=='string')throw new Error('Invalid setting.');
  else if(b.name==='email-from'){
   if(!/^[a-z0-9._+-]+@fond\.co\.za$/i.test(b.value.trim()))throw new Error('Use a sender address on the verified fond.co.za domain.');
   saveDocument('email-from',b.value.trim().toLowerCase(),who);
  } else if(names.includes(b.name)) saveProviderSecret(b.name,b.value,who);
  else throw new Error('Invalid setting.');
  return Response.json({ok:true},{headers:noStore});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Could not save setting.'},{status:400,headers:noStore});}
}
