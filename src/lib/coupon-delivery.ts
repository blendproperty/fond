import {randomUUID} from 'node:crypto';
import {getDb} from './db';
import {emailConfigured,sendEmailMessage} from './email';
import {providerSecret} from './provider-secrets';
import {buildCouponEmail} from './coupon-email';
import {publicBaseUrl} from './public-url';

export function couponEmailStatus(rewardId:string){
 return getDb().prepare("SELECT status,provider_id,error,updated_at FROM loyalty_messages WHERE reward_id=? AND channel='email'").get(rewardId) as {status:string;provider_id:string|null;error:string|null;updated_at:string}|undefined;
}
export async function sendCouponEmail(rewardId:string,actor:string){
 if(process.env.FOND_COUPON_TESTING!=='true')throw new Error('Coupon testing is disabled in this environment.');
 const db=getDb(),r=db.prepare("SELECT r.*,c.percent,c.amount_cents,c.expires_at FROM loyalty_rewards r JOIN coupons c ON c.reward_id=r.id WHERE r.id=? AND r.kind='coupon-manual'").get(rewardId);
 if(!r||r.status!=='available'||String(r.expires_at)<=new Date().toISOString())throw new Error('Only an available, unexpired manual coupon can be emailed.');
 const prior=couponEmailStatus(rewardId);
 if(prior){if(prior.provider_id)return prior;throw new Error('Email already requested. Check delivery before retrying; it will not be sent twice.');}
 if(!emailConfigured())throw new Error('Email provider is not configured. Coupon remains available and unsent.');
 const id=randomUUID(),now=new Date().toISOString();
 if(!db.prepare("INSERT OR IGNORE INTO loyalty_messages (id,reward_id,channel,recipient,status,updated_at) VALUES (?,?,'email',?,'sending',?)").run(id,rewardId,r.recipient_email,now).changes)throw new Error('Email already requested. Refresh its delivery status.');
 db.prepare('INSERT INTO loyalty_events VALUES (?,?,?,?,?,?)').run(randomUUID(),rewardId,'coupon-email-requested',actor,'Manual email to coupon recipient',now);
 try{
  const message=buildCouponEmail({code:String(r.code),email:String(r.recipient_email),reason:String(r.reason),percent:Number(r.percent),amountCents:Number(r.amount_cents),expiresAt:String(r.expires_at),kind:String(r.kind),baseUrl:publicBaseUrl()});
  const providerId=await sendEmailMessage(String(r.recipient_email),message,`fond-coupon-${id}`,'Midpoint Café · FOND');
  if(!providerId)throw new Error('Provider response did not include a message ID.');
  db.prepare("UPDATE loyalty_messages SET status='provider-accepted',provider_id=?,error=NULL,updated_at=? WHERE id=?").run(providerId,new Date().toISOString(),id);
 }catch{
  // A lost provider response may still mean delivery; never retry it automatically.
  db.prepare("UPDATE loyalty_messages SET status='unconfirmed',error='Check provider before retrying; delivery is unconfirmed',updated_at=? WHERE id=?").run(new Date().toISOString(),id);
 }
 return couponEmailStatus(rewardId)!;
}
export async function checkCouponEmail(rewardId:string){
 const job=couponEmailStatus(rewardId);if(!job?.provider_id)throw new Error('No provider message ID yet. Check provider before any resend.');
 const key=providerSecret('email-api');if(!key)throw new Error('Email provider is not configured.');
 const response=await fetch(`https://api.resend.com/emails/${encodeURIComponent(job.provider_id)}`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(12000)});
 if(!response.ok){
  const error=await response.json().catch(()=>null) as {name?:string}|null;
  if(error?.name==='restricted_api_key')throw new Error('Email submitted. This provider key permits sending only; confirm receipt in the recipient inbox or Resend dashboard. Do not resend.');
  throw new Error(`Could not check email delivery (${response.status}). The email has not been resent.`);
 }
 const result=await response.json() as {id:string;last_event:string;to:string[]};
 const recipient=getDb().prepare("SELECT recipient FROM loyalty_messages WHERE reward_id=? AND channel='email'").get(rewardId)?.recipient;
 if(result.id!==job.provider_id||!result.to?.includes(String(recipient)))throw new Error('Provider email does not match this coupon.');
 const status=({delivered:'delivered',opened:'delivered',clicked:'delivered',bounced:'bounced',failed:'failed',complained:'complained',delivery_delayed:'delivery-delayed'} as Record<string,string>)[result.last_event]??'provider-accepted';
 getDb().prepare("UPDATE loyalty_messages SET status=?,error=?,updated_at=? WHERE reward_id=? AND channel='email'").run(status,['bounced','failed','complained','delivery-delayed'].includes(status)?`Provider reported ${result.last_event}`:null,new Date().toISOString(),rewardId);
 return couponEmailStatus(rewardId)!;
}
