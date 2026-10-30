import {randomUUID} from 'node:crypto';
import {getDb} from './db';
import {emailConfigured,sendEmailMessage} from './email';
import {publicBaseUrl} from './public-url';

export const LOYALTY_APPROVAL_PATH='/admin?section=loyalty#coupon-approval-queue';
const managers=['ray@midpointhub.com','ali@midpointhub.com','michelle@midpointhub.com'];
const roles=['manager','owner','super-admin'];
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function queueApprovalAlerts(candidateId:string){
 const db=getDb();
 for(const username of managers){
  const member=db.prepare('SELECT id,role,active FROM team_members WHERE username=?').get(username);
  if(member?.active&&roles.includes(String(member.role)))db.prepare("INSERT OR IGNORE INTO coupon_approval_alerts (id,event_key,candidate_id,member_id,recipient,kind,created_at,updated_at) VALUES (?,?,?,?,?,'approval',?,?)").run(randomUUID(),candidateId,candidateId,member.id,username,new Date().toISOString(),new Date().toISOString());
 }
}
export function queueTestApprovalAlerts(requestKey:string,actor:string){
 if(process.env.FOND_COUPON_TESTING!=='true')throw new Error('Coupon testing is disabled.');
 if(!/^[a-f0-9-]{36}$/i.test(requestKey))throw new Error('Refresh before requesting a notification test.');
 const db=getDb(),eventKey='test:'+requestKey,now=new Date().toISOString();
 const members=managers.map(username=>db.prepare('SELECT id,username,role,active FROM team_members WHERE username=?').get(username));
 if(members.some(m=>!m?.active||!roles.includes(String(m.role))))throw new Error('Ray, Ali and Michelle must all have active manager access before testing alerts.');
 if(!emailConfigured())throw new Error('Email provider is not configured. No test alerts were queued.');
 db.exec('BEGIN IMMEDIATE');try{
  for(const m of members)db.prepare("INSERT OR IGNORE INTO coupon_approval_alerts (id,event_key,member_id,recipient,kind,created_at,updated_at) VALUES (?,?,?,?,'test',?,?)").run(randomUUID(),eventKey,m!.id,m!.username,now,now);
  db.prepare('INSERT INTO admin_events VALUES (?,?,?,?,?)').run(randomUUID(),actor,'loyalty-approval-alert-test',eventKey,now);db.exec('COMMIT');return eventKey;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
export function approvalAlertMessage(name:string,test:boolean){
 const base=publicBaseUrl(),url=base+LOYALTY_APPROVAL_PATH;
 const title=test?'Test approval alert':'Loyalty approval needed';
 const intro=test?'This is a notification delivery test for Ray, Ali and Michelle. No customer was selected and no coupon was created or sent.':'A customer has qualified for a loyalty reward and is waiting for a manager to approve or reject it.';
 const text=`${title}\n\nHi ${name},\n\n${intro}\n\nOpen the approval queue: ${url}\n\nSign in with your named team account. Approval saves a decision only. Issuing and emailing a coupon requires a separate manual action. Another manager may already have reviewed the customer; the queue shows the current status.\n\nMidpoint Hub / FOND`;
 const html=`<!doctype html><html><body style="margin:0;background:#eef2ee;font-family:Arial,sans-serif;color:#123f35"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff"><tr><td style="padding:24px;background:#123f35;color:#fff;font-size:12px;letter-spacing:2px">MIDPOINT HUB / TEAM NOTIFICATIONS</td></tr><tr><td style="padding:26px"><img src="${escape(base)}/brand/midpoint-cafe-powered-by-fond.png" width="220" alt="Midpoint Café powered by FOND" style="max-width:100%;height:auto"><p style="font-size:12px;color:#963c2b">${test?'DELIVERY TEST · NO CUSTOMER ACTION REQUIRED':'PENDING MANAGER APPROVAL'}</p><h1 style="font-size:30px;line-height:1.2">${title}</h1><p>Hi ${escape(name)},</p><p style="line-height:1.7">${intro}</p><p style="margin:28px 0"><a href="${escape(url)}" style="display:inline-block;padding:16px 22px;background:#963c2b;color:white;text-decoration:none;border-radius:6px;font-weight:bold">Open approval queue →</a></p><p style="font-size:13px;line-height:1.7">Sign in with your named team account. Approval saves a decision only. Issuing and emailing a coupon requires a separate manual action.</p><p style="font-size:12px;color:#5d6f6b;line-height:1.6">Another manager may already have reviewed the customer. The queue shows the current status. This email contains no customer details or coupon code.</p></td></tr><tr><td style="padding:20px 26px;background:#e6ede2;font-size:12px">Midpoint Hub · FOND · Management approval queue</td></tr></table></td></tr></table></body></html>`;
 return {subject:`${test?'[TEST] ':''}FOND loyalty: ${test?'approval notification test':'customer awaiting approval'}`,text,html};
}
export function approvalNotificationStatus(){
 const db=getDb();return {pending:Number(db.prepare("SELECT count(*) n FROM coupon_candidates WHERE status='pending'").get()?.n??0),alerts:db.prepare('SELECT id,candidate_id,recipient,kind,status,provider_id,error,updated_at FROM coupon_approval_alerts ORDER BY rowid DESC LIMIT 100').all()};
}
export async function processApprovalAlerts(){
 if(process.env.FOND_COUPON_TESTING!=='true')return;
 const db=getDb(),now=new Date().toISOString();
 db.prepare("UPDATE coupon_approval_alerts SET status='unconfirmed',error='Check provider before any resend',updated_at=? WHERE status='sending' AND updated_at<?").run(now,new Date(Date.now()-120000).toISOString());
 const configRow=db.prepare('SELECT value FROM coupon_settings WHERE id=1').get(),config=configRow?JSON.parse(String(configRow.value)):{enabled:false};
 const jobs=db.prepare("SELECT * FROM coupon_approval_alerts WHERE status='pending' ORDER BY rowid LIMIT 12").all();
 for(const job of jobs){
  const member=db.prepare('SELECT name,username,active,role FROM team_members WHERE id=?').get(job.member_id);
  const candidate=job.kind==='approval'?db.prepare('SELECT c.status,c.period,c.email,u.email AS current_email,u.email_verified_at FROM coupon_candidates c JOIN users u ON u.id=c.user_id WHERE c.id=?').get(job.candidate_id):null;
  if(!member?.active||!roles.includes(String(member.role))||member.username!==job.recipient||!managers.includes(String(job.recipient))||job.kind==='approval'&&(!config.enabled||candidate?.status!=='pending'||candidate.period!==config.since||!candidate.email_verified_at||candidate.email!==candidate.current_email)){
   db.prepare("UPDATE coupon_approval_alerts SET status='cancelled',error='Approval or manager access no longer current',updated_at=? WHERE id=? AND status='pending'").run(now,job.id);continue;
  }
  if(!emailConfigured()){db.prepare("UPDATE coupon_approval_alerts SET error='Email provider is not configured' WHERE id=? AND status='pending'").run(job.id);continue;}
  if(!db.prepare("UPDATE coupon_approval_alerts SET status='sending',error=NULL,updated_at=? WHERE id=? AND status='pending'").run(new Date().toISOString(),job.id).changes)continue;
  try{
   const providerId=await sendEmailMessage(String(job.recipient),approvalAlertMessage(String(member.name),job.kind==='test'),`fond-approval-${job.id}`,'Midpoint Hub · FOND');
   if(!providerId)throw new Error('No provider ID');
   db.prepare("UPDATE coupon_approval_alerts SET status='provider-accepted',provider_id=?,updated_at=? WHERE id=?").run(providerId,new Date().toISOString(),job.id);
  }catch{db.prepare("UPDATE coupon_approval_alerts SET status='unconfirmed',error='Delivery unconfirmed; check provider before any resend',updated_at=? WHERE id=?").run(new Date().toISOString(),job.id);}
 }
}
let worker:ReturnType<typeof setInterval>|undefined;
export function startApprovalAlertWorker(){
 if(worker||process.env.FOND_COUPON_TESTING!=='true'||process.env.FOND_APPROVAL_ALERTS_WORKER==='false')return;
 const run=()=>{void processApprovalAlerts().catch(()=>console.error('Loyalty approval alert worker failed; queued alerts retained.'));};
 worker=setInterval(run,15000);worker.unref();run();
}
