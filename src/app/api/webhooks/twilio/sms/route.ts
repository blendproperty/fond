import {getDb} from '@/lib/db';
import {publicBaseUrl} from '@/lib/public-url';
import {verifyTwilioSignature} from '@/lib/sms';

const noStore={'Cache-Control':'no-store'};
export async function POST(request:Request){
 const raw=await request.text(),params=new URLSearchParams(raw),signature=request.headers.get('x-twilio-signature')??'';
 const callback=`${publicBaseUrl()}/api/webhooks/twilio/sms`;
 if(!verifyTwilioSignature(callback,params,signature))return new Response('Invalid signature',{status:403,headers:noStore});
 const providerId=params.get('MessageSid'),status=params.get('MessageStatus'),error=params.get('ErrorCode');
 if(providerId&&status&&['queued','sending','sent','delivered','undelivered','failed'].includes(status))getDb().prepare('UPDATE sms_jobs SET status=?,last_error=?,updated_at=? WHERE provider_id=?').run(status,error?`TWILIO_${error}`:null,new Date().toISOString(),providerId);
 return new Response(null,{status:204,headers:noStore});
}
