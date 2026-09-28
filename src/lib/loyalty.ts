import {randomBytes,randomUUID} from 'node:crypto';
import {getDb} from './db';
import {quoteCart,type CartLine,type Meal} from './menu';
import {normalizePhone} from './management';

export type RewardEnvironment='live'|'test';
type Reward={id:string;code:string;recipient_email:string;environment:RewardEnvironment;kind:string;status:string;order_id:string|null;created_at:string};
const now=()=>new Date().toISOString();
function event(subject:string,action:string,actor:string,detail:string){getDb().prepare('INSERT INTO loyalty_events VALUES (?,?,?,?,?,?)').run(randomUUID(),subject,action,actor,detail,now());}
function verified(userId:string){const u=getDb().prepare('SELECT id,email,email_verified_at FROM users WHERE id=?').get(userId) as {id:string;email:string;email_verified_at:string|null}|undefined;if(!u?.email_verified_at)throw new Error('Sign in and verify your email to use coffee rewards.');return u;}
export function rewardPreferences(userId:string){return getDb().prepare('SELECT email_enabled,sms_enabled,phone FROM loyalty_preferences WHERE user_id=?').get(userId) as {email_enabled:number;sms_enabled:number;phone:string}|undefined??{email_enabled:0,sms_enabled:0,phone:''};}
export function saveRewardPreferences(userId:string,input:{email:boolean;sms:boolean;phone:string}){verified(userId);const phone=input.sms?normalizePhone(input.phone):'';getDb().prepare('INSERT INTO loyalty_preferences VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email_enabled=excluded.email_enabled,sms_enabled=excluded.sms_enabled,phone=excluded.phone').run(userId,input.email?1:0,input.sms?1:0,phone);event(userId,'notification-preferences',userId,JSON.stringify({email:input.email,sms:input.sms}));}
export function queueRewardMessages(reward:Reward,channels:{email:boolean;sms:boolean;phone:string}){const db=getDb();for(const [channel,recipient] of [['email',channels.email?reward.recipient_email:''],['sms',channels.sms?normalizePhone(channels.phone):'']])if(recipient)db.prepare("INSERT INTO loyalty_messages (id,reward_id,channel,recipient,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(reward_id,channel) DO UPDATE SET recipient=excluded.recipient,status='pending',updated_at=excluded.updated_at WHERE loyalty_messages.status IN ('cancelled','pending')").run(randomUUID(),reward.id,channel,recipient,now());}
function issue(email:string,environment:RewardEnvironment,kind:string,actor:string,reason:string,requestKey:string|null=null){const db=getDb(),id=randomUUID(),code='COFFEE-'+randomBytes(10).toString('hex').toUpperCase();db.prepare('INSERT INTO loyalty_rewards (id,code,recipient_email,environment,kind,created_at,actor,reason,request_key) VALUES (?,?,?,?,?,?,?,?,?)').run(id,code,email,environment,kind,now(),actor,reason,requestKey);event(id,'issued',actor,reason);return db.prepare('SELECT * FROM loyalty_rewards WHERE id=?').get(id) as Reward;}
export function issueGift(input:{email:string;environment:RewardEnvironment;reason:string;requestKey:string;emailEnabled:boolean;smsEnabled:boolean;phone:string},actor:string){
 const email=input.email.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter the recipient’s email address; this account will own the code.');if(!input.reason.trim()||input.reason.length>200)throw new Error('Record a short reason for this gift.');if(!/^[a-f0-9-]{36}$/i.test(input.requestKey))throw new Error('Refresh and try again.');if(input.smsEnabled)normalizePhone(input.phone);
 const db=getDb();db.exec('BEGIN IMMEDIATE');try{let reward=db.prepare('SELECT * FROM loyalty_rewards WHERE request_key=?').get(input.requestKey) as Reward|undefined;if(reward&&(reward.recipient_email!==email||reward.environment!==input.environment))throw new Error('This gift request was already used.');if(!reward){reward=issue(email,input.environment,'gift',actor,input.reason,input.requestKey);queueRewardMessages(reward,{email:input.emailEnabled,sms:input.smsEnabled,phone:input.phone});}db.exec('COMMIT');return reward;}catch(e){db.exec('ROLLBACK');throw e;}
}
export function quoteReward(userId:string,environment:RewardEnvironment,code:string,lines:CartLine[],menu:Meal[]){
 const u=verified(userId),db=getDb();const reward=db.prepare("SELECT * FROM loyalty_rewards WHERE code=? AND recipient_email=? AND environment=? AND status='available'").get(code.trim().toUpperCase(),u.email,environment) as Reward|undefined;
 if(!reward)throw new Error('This code is unavailable for your account or payment mode.');const priced=quoteCart(lines,menu);let lineIndex=-1,discountCents=0;
 priced.forEach((line,i)=>{const item=menu.find(m=>m.id===line.id);if(item?.category==='Coffee'&&Math.min(item.price,line.unitPrice)>discountCents){lineIndex=i;discountCents=Math.min(item.price,line.unitPrice);}});
 if(lineIndex<0)throw new Error('Add an item from the Coffee category to use this code.');return {reward,discountCents,lineIndex,totalCents:priced.reduce((sum,l)=>sum+l.subtotal,0)-discountCents};
}
export function quoteCounterReward(environment:RewardEnvironment,code:string,lines:CartLine[],menu:Meal[]){
 if(!code||code.length>40)throw new Error('Enter the customer’s coffee code.');
 const u=getDb().prepare("SELECT u.id FROM loyalty_rewards r JOIN users u ON u.email=r.recipient_email WHERE r.code=? AND r.environment=? AND r.status='available' AND u.email_verified_at IS NOT NULL").get(code.trim().toUpperCase(),environment) as {id:string}|undefined;
 if(!u)throw new Error('Code unavailable. Check that it is unused, the customer has verified their account and the payment mode matches.');
 return {...quoteReward(u.id,environment,code,lines,menu),userId:u.id};
}
// Called within the order transaction. Counter redemption never earns stamps.
export function attachOrderRewards(input:{orderId:string;userId?:string|null;source:string;environment?:RewardEnvironment;code?:string;counter?:boolean;actor?:string;lines:CartLine[];menu:Meal[]}):{discountCents:number;lineIndex:number;userId?:string}{
 if(input.counter){
  if(input.source!=='staff'||!input.environment||!input.code)throw new Error('Staff coffee redemption requires the staff order workflow.');
  const q=quoteCounterReward(input.environment,input.code,input.lines,input.menu),db=getDb();
  if(!db.prepare("UPDATE loyalty_rewards SET status='reserved',order_id=? WHERE id=? AND status='available'").run(input.orderId,q.reward.id).changes)throw new Error('This coffee code has just been used.');
  db.prepare('INSERT INTO loyalty_orders (order_id,user_id,environment,quantity,discount_cents,reward_id,line_index) VALUES (?,?,?,?,?,?,?)').run(input.orderId,q.userId,input.environment,0,q.discountCents,q.reward.id,q.lineIndex);
  event(q.reward.id,'reserved-at-counter',input.actor??'staff',input.orderId);
  return {discountCents:q.discountCents,lineIndex:q.lineIndex,userId:q.userId};
 }
 const db=getDb();if(input.code&&(!input.userId||input.source!=='customer'))throw new Error('Redeem coffee rewards while signed in through the FOND app.');
 if(input.source!=='customer'||!input.userId||!input.environment)return {discountCents:0,lineIndex:-1};
 const u=db.prepare('SELECT email_verified_at FROM users WHERE id=?').get(input.userId);if(!u?.email_verified_at){if(input.code)verified(input.userId);return {discountCents:0,lineIndex:-1};}
 const priced=quoteCart(input.lines,input.menu);const quote=input.code?quoteReward(input.userId,input.environment,input.code,input.lines,input.menu):null;
 const quantity=priced.reduce((sum,l)=>sum+(input.menu.find(m=>m.id===l.id)?.category==='Coffee'&&input.menu.find(m=>m.id===l.id)!.price>0?l.quantity:0),0)-(quote?1:0);
 if(quote){const changed=db.prepare("UPDATE loyalty_rewards SET status='reserved',order_id=? WHERE id=? AND status='available'").run(input.orderId,quote.reward.id);if(!changed.changes)throw new Error('This coffee code has just been used.');event(quote.reward.id,'reserved',input.userId,input.orderId);}
 db.prepare('INSERT INTO loyalty_orders (order_id,user_id,environment,quantity,discount_cents,reward_id,line_index) VALUES (?,?,?,?,?,?,?)').run(input.orderId,input.userId,input.environment,quantity,quote?.discountCents??0,quote?.reward.id??null,quote?.lineIndex??null);
 return {discountCents:quote?.discountCents??0,lineIndex:quote?.lineIndex??-1};
}
export function loyaltyCredits(userId:string,environment:RewardEnvironment){const db=getDb();return Number(db.prepare('SELECT coalesce(sum(credited),0) AS n FROM loyalty_orders WHERE user_id=? AND environment=?').get(userId,environment)?.n)+Number(db.prepare('SELECT coalesce(sum(credited),0) AS n FROM counter_reward_sales WHERE user_id=? AND environment=?').get(userId,environment)?.n);}
export function reconcileBalance(userId:string,environment:RewardEnvironment){
 const db=getDb(),u=db.prepare('SELECT email,email_verified_at FROM users WHERE id=?').get(userId) as {email:string;email_verified_at:string|null},credits=loyaltyCredits(userId,environment),entitled=Math.floor(credits/10);
 const earned=db.prepare("SELECT * FROM loyalty_rewards WHERE recipient_email=? AND environment=? AND kind='earned' AND status!='revoked' ORDER BY created_at DESC,rowid DESC").all(u.email,environment) as Reward[];
 let active=earned.length;for(const r of earned){if(active<=entitled)break;if(r.status==='available'){db.prepare("UPDATE loyalty_rewards SET status='revoked' WHERE id=?").run(r.id);event(r.id,'revoked','system','Qualifying stamps reversed');active--;}}
 const prefs=rewardPreferences(userId);while(u.email_verified_at&&active<entitled){const reward=issue(u.email,environment,'earned','system','10 qualifying paid coffees');queueRewardMessages(reward,{email:!!prefs.email_enabled,sms:!!prefs.sms_enabled,phone:prefs.phone});active++;}
}
// Called inside payment/status transactions; any refund reverses the entire order's stamps conservatively.
export function reconcileOrderRewards(orderId:string){
 const db=getDb(),row=db.prepare('SELECT l.*,o.status,o.total_cents FROM loyalty_orders l JOIN orders o ON o.id=l.order_id WHERE l.order_id=?').get(orderId) as {user_id:string;environment:RewardEnvironment;quantity:number;credited:number;reward_id:string|null;status:string;total_cents:number}|undefined;if(!row)return;
 const pay=db.prepare('SELECT coalesce(sum(amount_cents),0) AS paid,coalesce(sum(CASE WHEN amount_cents<0 THEN 1 ELSE 0 END),0) AS refunds FROM payment_records WHERE order_id=?').get(orderId) as {paid:number;refunds:number};
 const credit=row.status==='completed'&&pay.paid>=row.total_cents&&!pay.refunds?row.quantity:0;
 if(credit!==row.credited){db.prepare('UPDATE loyalty_orders SET credited=? WHERE order_id=?').run(credit,orderId);event(orderId,'stamps-adjusted','system',String(credit-row.credited));}
 if(row.reward_id){const reward=db.prepare('SELECT * FROM loyalty_rewards WHERE id=?').get(row.reward_id) as Reward;if(reward.order_id===orderId&&reward.status==='reserved'){
  if(row.status==='completed'){db.prepare("UPDATE loyalty_rewards SET status='redeemed' WHERE id=?").run(reward.id);event(reward.id,'redeemed','system',orderId);}
  else if(row.status==='cancelled'){db.prepare("UPDATE loyalty_rewards SET status='available',order_id=NULL WHERE id=?").run(reward.id);event(reward.id,'released','system',orderId);}
 }}reconcileBalance(row.user_id,row.environment);
}
export function customerRewards(userId:string,environment:RewardEnvironment){const db=getDb(),u=verified(userId),credits=loyaltyCredits(userId,environment);const rewards=db.prepare('SELECT id,code,kind,status,created_at,order_id FROM loyalty_rewards WHERE recipient_email=? AND environment=? ORDER BY created_at DESC LIMIT 100').all(u.email,environment);const spent=Number(db.prepare("SELECT count(*) AS n FROM loyalty_rewards WHERE recipient_email=? AND environment=? AND kind='earned' AND status!='revoked'").get(u.email,environment)?.n)*10;return {environment,stamps:Math.max(0,credits-spent),stampsToNext:Math.max(1,10+spent-credits),rewards,preferences:rewardPreferences(userId)};}
export function orderRewardSummary(orderId:string){return getDb().prepare('SELECT discount_cents AS discountCents,quantity AS eligibleCoffees,environment FROM loyalty_orders WHERE order_id=?').get(orderId)??null;}
export function adminRewards(){return {rewards:getDb().prepare('SELECT id,recipient_email,environment,kind,status,created_at,reason FROM loyalty_rewards ORDER BY rowid DESC LIMIT 100').all(),messages:getDb().prepare('SELECT channel,status,error,updated_at FROM loyalty_messages ORDER BY rowid DESC LIMIT 100').all(),events:getDb().prepare('SELECT subject,action,actor,detail,created_at FROM loyalty_events ORDER BY rowid DESC LIMIT 100').all()};}

export function sendCustomerReward(userId:string,rewardId:string){const u=verified(userId),r=getDb().prepare("SELECT * FROM loyalty_rewards WHERE id=? AND recipient_email=? AND status='available'").get(rewardId,u.email) as Reward|undefined;if(!r)throw new Error('Reward unavailable.');const p=rewardPreferences(userId);if(!p.email_enabled&&!p.sms_enabled)throw new Error('Save an email or SMS preference first.');queueRewardMessages(r,{email:!!p.email_enabled,sms:!!p.sms_enabled,phone:p.phone});event(r.id,'delivery-requested',userId,'Saved reward notification channels');}
export function revokeGift(id:string,actor:string){const db=getDb();db.exec('BEGIN IMMEDIATE');try{if(!db.prepare("UPDATE loyalty_rewards SET status='revoked' WHERE id=? AND kind='gift' AND status='available'").run(id).changes)throw new Error('Only unused, unreserved gifts can be revoked.');event(id,'revoked',actor,'Administrator withdrew unused gift');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
