import {randomBytes,randomUUID} from 'node:crypto';
import {getDb} from './db';
import {buildCouponEmail} from './coupon-email';
import {publicBaseUrl} from './public-url';

export type CouponTerms={percent:number;amountCents:number;validDays:number};
export type CouponSettings=CouponTerms&{enabled:boolean;days:number;since:string};
const defaults:CouponSettings={enabled:false,days:5,percent:10,amountCents:0,validDays:30,since:''};
function testingEnabled(){return process.env.FOND_COUPON_TESTING==='true';}
function requireTesting(){if(!testingEnabled())throw new Error('Coupon testing is disabled in this environment.');}
export function couponSettings():CouponSettings{
 const row=getDb().prepare('SELECT value FROM coupon_settings WHERE id=1').get();
 return row?JSON.parse(String(row.value)):defaults;
}
export function couponRecipients(query:string){
 if(query.length>100)throw new Error('Keep the customer search to 100 characters.');
 const rows=getDb().prepare('SELECT email,email_verified_at IS NOT NULL AS verified FROM users WHERE instr(lower(email),?)>0 ORDER BY email LIMIT 51').all(query.trim().toLowerCase());
 return {recipients:rows.slice(0,50).map(r=>({email:String(r.email),verified:!!r.verified})),hasMore:rows.length>50};
}
function terms(input:CouponTerms){
 if(!Number.isInteger(input.percent)||input.percent<0||input.percent>100||!Number.isInteger(input.amountCents)||input.amountCents<0||input.amountCents>100000||!(input.percent||input.amountCents)||!Number.isInteger(input.validDays)||input.validDays<1||input.validDays>365)throw new Error('Choose 0–100%, R0–R1000 and 1–365 days; at least one saving is required.');
}
function audit(subject:string,action:string,actor:string,detail:string){getDb().prepare('INSERT INTO loyalty_events VALUES (?,?,?,?,?,?)').run(randomUUID(),subject,action,actor,detail,new Date().toISOString());}
export function saveCouponSettings(input:Omit<CouponSettings,'since'>,actor:string){
 requireTesting();
 terms(input);if(typeof input.enabled!=='boolean'||!Number.isInteger(input.days)||input.days<2||input.days>90)throw new Error('Choose 2–90 consecutive purchase days.');
 const previous=couponSettings();
 // Every rule edit starts a new test period; historical purchases are not enrolled.
 const unchanged=(['enabled','days','percent','amountCents','validDays'] as const).every(k=>previous[k]===input[k]);
 const value={...input,since:unchanged?previous.since:new Date().toISOString()};
 getDb().prepare('INSERT INTO coupon_settings VALUES (1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(value));
 audit('coupon-settings','coupon-settings',actor,JSON.stringify(value));return value;
}
function issue(email:string,input:CouponTerms,key:string,kind:string,actor:string,reason:string,days:string[]=[]){
 const db=getDb(),existing=db.prepare('SELECT id,code FROM loyalty_rewards WHERE request_key=?').get(key);
 if(existing)return {id:String(existing.id),code:String(existing.code)};
 const id=randomUUID(),code='COUPON-'+randomBytes(10).toString('hex').toUpperCase(),created=new Date().toISOString(),expires=new Date(Date.now()+input.validDays*86400000).toISOString();
 db.prepare("INSERT INTO loyalty_rewards (id,code,recipient_email,environment,kind,created_at,actor,reason,request_key) VALUES (?,?,?,'test',?,?,?,?,?)").run(id,code,email,kind,created,actor,reason,key);
 const preview=buildCouponEmail({code,email,reason,percent:input.percent,amountCents:input.amountCents,expiresAt:expires,kind,baseUrl:publicBaseUrl()}).text;
 db.prepare('INSERT INTO coupons VALUES (?,?,?,?,?,?,?)').run(id,input.percent,input.amountCents,expires,preview,kind==='coupon-auto'?key:null,JSON.stringify(days));
 audit(id,'coupon-issued',actor,reason);return {id,code};
}
export function issueCoupons(input:CouponTerms&{emails:string[];reason:string;requestKey:string},actor:string){
 requireTesting();
 terms(input);if(!Array.isArray(input.emails)||input.emails.length<1||input.emails.length>50)throw new Error('Select 1–50 recipient email addresses.');
 const emails=[...new Set(input.emails.map(e=>typeof e==='string'?e.trim().toLowerCase():''))].sort();
 if(emails.some(e=>e.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))throw new Error('Enter valid recipient emails.');
 if(typeof input.reason!=='string'||!input.reason.trim()||input.reason.length>200||!/^[a-f0-9-]{36}$/i.test(input.requestKey))throw new Error('Enter a reason and refresh before retrying.');
 const db=getDb(),payload=JSON.stringify({emails,percent:input.percent,amountCents:input.amountCents,validDays:input.validDays,reason:input.reason});
 db.exec('BEGIN IMMEDIATE');try{
  const previous=db.prepare('SELECT payload FROM coupon_batches WHERE id=?').get(input.requestKey);
  if(previous&&previous.payload!==payload)throw new Error('This request was already used with different details.');
  db.prepare('INSERT OR IGNORE INTO coupon_batches VALUES (?,?)').run(input.requestKey,payload);
  const rewards=emails.map(email=>issue(email,input,`manual:${input.requestKey}:${email}`,'coupon-manual',actor,input.reason));
  db.exec('COMMIT');return rewards;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function couponDiscount(rewardId:string,environment:string,subtotal:number){
 const c=getDb().prepare('SELECT * FROM coupons WHERE reward_id=?').get(rewardId);
 if(!c)return null;
 requireTesting();
 if(environment!=='test')throw new Error('Test coupons cannot be used for live payment.');
 if(String(c.expires_at)<=new Date().toISOString())throw new Error('This coupon has expired.');
 const discount=Math.min(subtotal,Math.floor(subtotal*Number(c.percent)/100)+Number(c.amount_cents));
 if(discount<=0)throw new Error('Add a payable item to use this coupon.');return discount;
}
// Called within the existing payment/status transaction. Only test app orders qualify.
export function reconcileCoupons(userId:string,environment:string){
 if(environment!=='test'||!testingEnabled())return;
 const db=getDb(),config=couponSettings();
 const u=db.prepare('SELECT email,email_verified_at FROM users WHERE id=?').get(userId);
 if(!u?.email_verified_at)return;
 const rows=db.prepare(`SELECT date(o.created_at,'+2 hours') AS day,max(o.created_at) AS latest FROM orders o
 JOIN loyalty_orders l ON l.order_id=o.id WHERE l.user_id=? AND l.environment='test'
 AND o.source='customer' AND o.status='completed' AND o.total_cents>0
 AND (SELECT coalesce(sum(p.amount_cents),0) FROM payment_records p WHERE p.order_id=o.id)>=o.total_cents
 AND NOT EXISTS (SELECT 1 FROM payment_records p WHERE p.order_id=o.id AND p.amount_cents<0) GROUP BY day ORDER BY day`).all(userId);
 const previous=db.prepare("SELECT r.id,r.status,c.qualification_days FROM coupons c JOIN loyalty_rewards r ON r.id=c.reward_id WHERE r.recipient_email=? AND r.kind='coupon-auto'").all(u.email);
 // Issued days remain consumed after a refund/revocation, preventing overlapping rewards.
 const usedDays=new Set(previous.flatMap(r=>JSON.parse(String(r.qualification_days)) as string[]));
 let streak:string[]=[];const eligible=new Map<string,string[]>(),paidDays=new Set(rows.map(r=>String(r.day)));
 for(const row of rows.filter(r=>String(r.latest)>=config.since&&!usedDays.has(String(r.day)))){const day=String(row.day);if(streak.length&&Date.parse(day)-Date.parse(streak[streak.length-1])!==86400000)streak=[];streak.push(day);
  if(streak.length===config.days){eligible.set(`auto:${config.since}:${userId}:${day}`,streak);streak=[];}
 }
 for(const r of previous.filter(r=>r.status==='available')){
  if((JSON.parse(String(r.qualification_days)) as string[]).some(day=>!paidDays.has(day))){db.prepare("UPDATE loyalty_rewards SET status='revoked' WHERE id=?").run(r.id);audit(String(r.id),'coupon-revoked','system','Qualifying purchase reversed');}
 }
 if(config.enabled)for(const [key,days] of eligible)issue(String(u.email),config,key,'coupon-auto','system',`${config.days} consecutive paid app purchase days`,days);
}
export function revokeCoupon(id:string,actor:string){
 if(!getDb().prepare("UPDATE loyalty_rewards SET status='revoked' WHERE id=? AND kind IN ('coupon-manual','coupon-auto') AND status='available'").run(id).changes)throw new Error('Only unused coupons can be revoked.');
 audit(id,'coupon-revoked',actor,'Management withdrew test coupon');
}
export function adminCoupons(){
 const rows=getDb().prepare('SELECT r.id,r.code,r.recipient_email,r.kind,r.status,r.reason,c.percent,c.amount_cents,c.expires_at FROM coupons c JOIN loyalty_rewards r ON r.id=c.reward_id ORDER BY r.rowid DESC LIMIT 100').all() as {id:string;code:string;recipient_email:string;kind:string;status:string;reason:string;percent:number;amount_cents:number;expires_at:string}[];
 const coupons=rows.map(r=>{
  const email=buildCouponEmail({code:String(r.code),email:String(r.recipient_email),reason:String(r.reason),percent:Number(r.percent),amountCents:Number(r.amount_cents),expiresAt:String(r.expires_at),kind:String(r.kind),baseUrl:publicBaseUrl()});
  return {...r,email_preview:email.text,email_subject:email.subject,email_html:email.html,email_design:email.designLabel,email_theme:email.theme};
 });
 return {testingEnabled:testingEnabled(),settings:couponSettings(),environment:'test',delivery:'preview-only',coupons};
}
