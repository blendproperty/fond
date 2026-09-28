import {getDb} from './db';
import {sendEmailMessage,emailConfigured} from './email';
import {sendSmsText,smsConfigured} from './sms';
import {publicBaseUrl} from './public-url';
import {rewardPreferences} from './loyalty';

export async function processRewardMessages(){
 const db=getDb();
 // A lost response must be reviewed rather than silently resending an SMS.
 db.prepare("UPDATE loyalty_messages SET status='unconfirmed',error='Check provider before retrying' WHERE status='sending' AND updated_at<?").run(new Date(Date.now()-120000).toISOString());
 const jobs=db.prepare("SELECT m.*,r.code,r.status AS reward_status,r.environment,r.kind,r.recipient_email FROM loyalty_messages m JOIN loyalty_rewards r ON r.id=m.reward_id WHERE m.status='pending' ORDER BY m.rowid LIMIT 10").all() as {id:string;channel:string;recipient:string;code:string;reward_status:string;environment:string;kind:string;recipient_email:string}[];
 for(const job of jobs){
  if(job.reward_status!=='available'){db.prepare("UPDATE loyalty_messages SET status='cancelled' WHERE id=? AND status='pending'").run(job.id);continue;}
  if(job.kind==='earned'){const user=db.prepare('SELECT id FROM users WHERE email=?').get(job.recipient_email);const p=user?rewardPreferences(String(user.id)):null;if(!p||(job.channel==='email'?!p.email_enabled:!p.sms_enabled||p.phone!==job.recipient)){db.prepare("UPDATE loyalty_messages SET status='cancelled' WHERE id=? AND status='pending'").run(job.id);continue;}}
  if(job.channel==='email'?!emailConfigured():!smsConfigured())continue;
  if(!db.prepare("UPDATE loyalty_messages SET status='sending',updated_at=? WHERE id=? AND status='pending'").run(new Date().toISOString(),job.id).changes)continue;
  const text=`${job.environment==='test'?'TEST REWARD - ':''}FOND: Your free coffee code is ${job.code}. Redeem once in the FOND app or show your code to staff. Account: ${job.recipient_email}. Any one Coffee item; extras cost extra. ${publicBaseUrl()}/rewards`;
  try{
   let providerId:string|null=null;
   if(job.channel==='email')providerId=await sendEmailMessage(job.recipient,{subject:`${job.environment==='test'?'TEST - ':''}Your FOND free coffee code`,text,html:`<p>${text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</p>`},`fond-reward-${job.id}`);
   else {const r=await sendSmsText(job.recipient,text);if(!r.sent)throw new Error(r.reason);providerId=r.providerId;}
   db.prepare("UPDATE loyalty_messages SET status='provider-accepted',provider_id=?,error=NULL,updated_at=? WHERE id=?").run(providerId,new Date().toISOString(),job.id);
  }catch{db.prepare("UPDATE loyalty_messages SET status='unconfirmed',error='Provider response needs review; code remains in the customer account',updated_at=? WHERE id=?").run(new Date().toISOString(),job.id);}
 }
}
