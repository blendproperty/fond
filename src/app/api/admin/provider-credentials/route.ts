import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {providerSecretStatus,saveProviderSecret,type ProviderName} from '@/lib/provider-secrets';
import {teamSession} from '@/lib/team';
import {emailSender,validEmailSender} from '@/lib/email';
import {saveDocument} from '@/lib/management';
import {metaConfig,twilioConfig,validateMetaConfig,validateTwilioConfig} from '@/lib/whatsapp';
import {validRequestOrigin} from '@/lib/request-origin';
import {yocoCredentialMode} from '@/lib/payments';
import {publicBaseUrl} from '@/lib/public-url';
import {smsConfig,validateSmsConfig} from '@/lib/sms';
const names:ProviderName[]=['yoco-secret','yoco-webhook','email-api','staff-shared-code','twilio-auth-token','meta-access-token','meta-app-secret','meta-webhook-verify'];
const noStore={'Cache-Control':'no-store'};
async function actor(){const token=(await cookies()).get(ADMIN_COOKIE)?.value;if(adminRole(token)!=='super-admin')return null;const member=teamSession(token);return member?'super:'+member.id:'shared-admin';}
export async function GET(){if(!await actor())return Response.json({message:'Super admin access required.'},{status:403,headers:noStore});const base=publicBaseUrl();return Response.json({configured:Object.fromEntries(names.map(n=>[n,providerSecretStatus(n)])),yocoMode:yocoCredentialMode(),webhookUrl:base?`${base}/api/payments/webhook`:'Public URL not configured',whatsappWebhookUrl:base?`${base}/api/webhooks/whatsapp`:'Public URL not configured',smsWebhookUrl:base?`${base}/api/webhooks/twilio/sms`:'Public URL not configured',vaultReady:/^[a-f0-9]{64}$/i.test(process.env.FOND_CREDENTIALS_KEY??''),emailFrom:emailSender(),twilio:twilioConfig(),sms:smsConfig(),meta:metaConfig()},{headers:noStore});}
export async function POST(request:Request){const who=await actor();if(!who)return Response.json({message:'Super admin access required.'},{status:403,headers:noStore});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers:noStore});
 const b=await request.json().catch(()=>null);if(!b)return Response.json({message:'Invalid setting.'},{status:400,headers:noStore});
 try{
  if(b.name==='twilio-config')saveDocument('twilio-config',validateTwilioConfig(b.value),who);
  else if(b.name==='twilio-sms-config')saveDocument('twilio-sms-config',validateSmsConfig(b.value),who);
  else if(b.name==='meta-whatsapp-config')saveDocument('meta-whatsapp-config',validateMetaConfig(b.value),who);
  else if(typeof b.value!=='string')throw new Error('Invalid setting.');
  else if(b.name==='email-from'){
   if(!validEmailSender(b.value))throw new Error('Use a sender address on the verified fond.mid-point.co.za domain.');
   saveDocument('email-from',b.value.trim().toLowerCase(),who);
  } else if(names.includes(b.name)) saveProviderSecret(b.name,b.value,who);
  else throw new Error('Invalid setting.');
  return Response.json({ok:true},{headers:noStore});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Could not save setting.'},{status:400,headers:noStore});}
}
