import {createHmac,timingSafeEqual} from 'node:crypto';
import {document} from './management';
import {providerSecret} from './provider-secrets';
import {publicBaseUrl} from './public-url';

export type SmsConfig={accountSid:string;sender:string};
export type SmsTemplate='order_accepted'|'order_ready';
export type SmsFulfillment='collection'|'delivery';
export const EMPTY_SMS:SmsConfig={accountSid:'',sender:''};
export const smsConfig=():SmsConfig=>({...EMPTY_SMS,...document('twilio-sms-config',EMPTY_SMS)});
export function validateSmsConfig(input:unknown):SmsConfig{
 const raw=input as Partial<SmsConfig>,value={accountSid:raw?.accountSid?.trim()??'',sender:raw?.sender?.trim()??''};
 if(!/^AC[a-f0-9]{32}$/i.test(value.accountSid))throw new Error('Enter a valid Twilio Account SID.');
 if(!/^\+[1-9]\d{7,14}$/.test(value.sender))throw new Error('Enter the SMS sender in international format, for example +27600928520.');
 return value;
}
export function smsConfigured(){try{validateSmsConfig(smsConfig());return !!providerSecret('twilio-auth-token');}catch{return false;}}
export function smsBody(template:SmsTemplate,reference:string,fulfillment:SmsFulfillment='collection'){return template==='order_accepted'?`FOND: Your order ${reference} has been accepted and is being prepared.`:fulfillment==='delivery'?`FOND: Your order ${reference} is ready and will be delivered shortly.`:`FOND: Your order ${reference} is ready for collection.`;}
export async function sendSmsNotification(input:{toE164:string;templateName:SmsTemplate;reference:string;fulfillment?:SmsFulfillment;statusCallback?:boolean}){
 if(!smsConfigured())return {sent:false,reason:'NOT_CONFIGURED'} as const;
 const config=smsConfig(),token=providerSecret('twilio-auth-token')!;
 const body=new URLSearchParams({From:config.sender,To:input.toE164,Body:smsBody(input.templateName,input.reference,input.fulfillment)});
 if(input.statusCallback!==false)body.set('StatusCallback',`${publicBaseUrl()}/api/webhooks/twilio/sms`);
 try{
  const response=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:`Basic ${Buffer.from(`${config.accountSid}:${token}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await response.json().catch(()=>({})) as {sid?:string;status?:string;message?:string;code?:number};
  if(!response.ok||!data.sid)return {sent:false,reason:data.code?`TWILIO_${data.code}`:`TWILIO_HTTP_${response.status}`} as const;
  return {sent:true,providerId:data.sid,providerStatus:data.status??'queued'} as const;
 }catch{return {sent:false,reason:'NETWORK_ERROR'} as const;}
}
function same(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function verifyTwilioSignature(url:string,params:URLSearchParams,signature:string){
 const token=providerSecret('twilio-auth-token');if(!token||!signature)return false;
 const pairs=[...params.entries()].sort(([a],[b])=>a.localeCompare(b));
 const value=url+pairs.map(([key,item])=>key+item).join('');
 return same(createHmac('sha1',token).update(value).digest('base64'),signature);
}
