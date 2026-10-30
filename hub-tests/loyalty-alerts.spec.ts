import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {getDb,resetDbForTests} from '../src/lib/db';
import {signUp} from '../src/lib/auth';
import {saveMember} from '../src/lib/team';
import {createOrder,recordPosEntry,updateOrderStatus} from '../src/lib/orders';
import {recordPayment} from '../src/lib/business-data';
import {couponSettings,saveCouponSettings,adminCoupons} from '../src/lib/coupons';
import {saveProviderSecret} from '../src/lib/provider-secrets';
import {saveDocument} from '../src/lib/management';
import {processApprovalAlerts,approvalAlertMessage,LOYALTY_APPROVAL_PATH} from '../src/lib/loyalty-approval-alerts';

test('paid streak -> three manager alerts -> real badge -> linked login/queue -> approval, without issuing a coupon',async({page},info)=>{
 test.setTimeout(90000);
 if(!process.env.FOND_HUB_TEST_DB)throw new Error('Use the isolated Hub test database.');
 const savedEnv={db:process.env.FOND_DB_PATH,key:process.env.FOND_CREDENTIALS_KEY,testing:process.env.FOND_COUPON_TESTING,url:process.env.FOND_PUBLIC_URL};
 process.env.FOND_DB_PATH=process.env.FOND_HUB_TEST_DB;process.env.FOND_CREDENTIALS_KEY='b'.repeat(64);process.env.FOND_COUPON_TESTING='true';process.env.FOND_PUBLIC_URL='https://midpointhub.com';resetDbForTests();
 const db=getDb(),priorSettings=db.prepare('SELECT value FROM coupon_settings WHERE id=1').get(),priorProvider=db.prepare("SELECT * FROM provider_secrets WHERE name='email-api'").get(),priorSender=db.prepare("SELECT * FROM app_documents WHERE key='email-from'").get();
 const password='isolated-alert-fixture-password',email=`alert-customer-${info.project.name}-${Date.now()}@example.test`;let candidateId='';
 try{
  for(const name of ['Ray','Ali','Michelle']){
   const username=name.toLowerCase()+'@midpointhub.com',existing=db.prepare('SELECT id FROM team_members WHERE username=?').get(username);
   saveMember({id:existing?String(existing.id):undefined,name,username,role:'manager',active:true,password},'shared-admin');
  }
  const u=signUp(email,password).user;db.prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(new Date().toISOString(),u.id);
  saveCouponSettings({enabled:true,days:2,percent:10,amountCents:500,validDays:30},'isolated-e2e');db.prepare('UPDATE coupon_settings SET value=?').run(JSON.stringify({...couponSettings(),since:'2026-01-01T00:00:00Z'}));
  for(const day of ['2026-01-01T12:00:00Z','2026-01-02T12:00:00Z']){
   const o=createOrder({customerName:'Isolated notification fixture',contactNumber:'0821234567',collectionTime:'ASAP',source:'customer',userId:u.id,rewardEnvironment:'test',lines:[{id:'espresso-single',quantity:1}]});
   db.prepare('UPDATE orders SET created_at=? WHERE id=?').run(day,o.id);updateOrderStatus(o.id,'accepted');recordPosEntry(o.id,randomUUID(),'isolated-e2e');updateOrderStatus(o.id,'ready');recordPayment({orderId:o.id,amountCents:o.totalCents,method:'cash',reference:randomUUID()},'isolated-e2e');updateOrderStatus(o.id,'completed');
  }
  candidateId=String(db.prepare('SELECT id FROM coupon_candidates WHERE user_id=?').get(u.id)!.id);expect(adminCoupons().coupons).toHaveLength(0);
  saveProviderSecret('email-api','re_isolated-approval-fixture','isolated-e2e');saveDocument('email-from','orders@fond.mid-point.co.za','isolated-e2e');
  const originalFetch=global.fetch,messages:{to:string[];html:string;text:string}[]=[];
  global.fetch=async(_url,init)=>{messages.push(JSON.parse(String(init?.body)));return Response.json({id:'fixture-alert-'+messages.length});};
  try{await processApprovalAlerts();await processApprovalAlerts();}finally{global.fetch=originalFetch;}
  expect(messages.map(m=>m.to[0]).sort()).toEqual(['ali@midpointhub.com','michelle@midpointhub.com','ray@midpointhub.com']);expect(messages.every(m=>m.text.includes(LOYALTY_APPROVAL_PATH)&&!m.text.includes(email))).toBe(true);expect(db.prepare("SELECT count(*) n FROM coupon_approval_alerts WHERE candidate_id=? AND status='provider-accepted'").get(candidateId)?.n).toBe(3);
  // Restore provider settings before any subsequent HTTP request; only this test's fetch stub sends messages.
  db.prepare("DELETE FROM provider_secrets WHERE name='email-api'").run();if(priorProvider)db.prepare('INSERT INTO provider_secrets VALUES (?,?,?,?,?)').run(priorProvider.name,priorProvider.iv,priorProvider.tag,priorProvider.ciphertext,priorProvider.updated_at);
  db.prepare("DELETE FROM app_documents WHERE key='email-from'").run();if(priorSender)db.prepare('INSERT INTO app_documents (key,value,updated_at) VALUES (?,?,?)').run(priorSender.key,priorSender.value,priorSender.updated_at);
  await page.goto('/admin');await page.getByLabel('Team username').fill('ray@midpointhub.com');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const badge=page.getByRole('link',{name:'Loyalty approvals: 1 pending',exact:true});await expect(badge).toBeVisible();await expect(badge).toHaveAttribute('href',LOYALTY_APPROVAL_PATH);await badge.click();
  const queue=page.getByRole('region',{name:'Customers selected for loyalty'});await expect(queue).toBeVisible();expect(page.url()).toContain(LOYALTY_APPROVAL_PATH);await expect(page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);
  const card=queue.locator('article').filter({hasText:email});await expect(card).toContainText('Status: pending');await page.screenshot({path:info.outputPath('pending-approval-badge.png'),fullPage:true});
  await card.getByRole('button',{name:'Approve',exact:true}).click();await expect(card).toContainText('Approved · no coupon issued or emailed yet.');await expect(page.getByRole('link',{name:/^Loyalty approvals/})).toHaveCount(0);expect(adminCoupons().coupons).toHaveLength(0);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.goto(LOYALTY_APPROVAL_PATH);await page.getByLabel('Team username').fill('ray@midpointhub.com');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('region',{name:'Customers selected for loyalty'})).toBeVisible();
  const message=approvalAlertMessage('Ray',false);await writeFile(info.outputPath('manager-approval-email.html'),message.html);await page.setContent(message.html);await expect(page.getByRole('heading',{name:'Loyalty approval needed'})).toBeVisible();await expect(page.getByRole('link',{name:'Open approval queue →'})).toHaveAttribute('href','https://midpointhub.com'+LOYALTY_APPROVAL_PATH);await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth>0))).toBe(true);expect(await page.locator('body').evaluate(el=>el.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('manager-approval-email.png'),fullPage:true});
 }finally{
  if(candidateId)db.prepare("UPDATE coupon_candidates SET status='cancelled' WHERE id=?").run(candidateId);
  if(priorSettings)db.prepare('UPDATE coupon_settings SET value=? WHERE id=1').run(priorSettings.value);else db.prepare('DELETE FROM coupon_settings WHERE id=1').run();
  db.prepare("DELETE FROM provider_secrets WHERE name='email-api'").run();if(priorProvider)db.prepare('INSERT INTO provider_secrets VALUES (?,?,?,?,?)').run(priorProvider.name,priorProvider.iv,priorProvider.tag,priorProvider.ciphertext,priorProvider.updated_at);
  db.prepare("DELETE FROM app_documents WHERE key='email-from'").run();if(priorSender)db.prepare('INSERT INTO app_documents (key,value,updated_at) VALUES (?,?,?)').run(priorSender.key,priorSender.value,priorSender.updated_at);
  resetDbForTests();for(const [key,value] of Object.entries({FOND_DB_PATH:savedEnv.db,FOND_CREDENTIALS_KEY:savedEnv.key,FOND_COUPON_TESTING:savedEnv.testing,FOND_PUBLIC_URL:savedEnv.url})){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
