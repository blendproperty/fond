import {test,expect} from '@playwright/test';

test('candidate review UI separates approval and actual send and hides actions after rejection',async({page},info)=>{
 await page.goto('/admin');await page.getByLabel('Admin access code').fill(process.env.FOND_ADMIN_CODE!);await page.getByRole('button',{name:'Unlock',exact:true}).click();
 const candidates=[{id:'synthetic-pending',email:'approved@example.test',status:'pending',qualification_days:'["2026-10-01","2026-10-02"]',terms:'{"percent":10,"amountCents":500,"validDays":30}',reviewed_by:null,reviewer_name:null},{id:'synthetic-reject',email:'rejected@example.test',status:'pending',qualification_days:'["2026-10-01","2026-10-02"]',terms:'{"percent":15,"amountCents":0,"validDays":14}',reviewed_by:null,reviewer_name:null}];let pushes=0;
 await page.route('**/api/admin/coupons',async route=>{
  if(route.request().method()==='GET'){const r=await route.fetch(),data=await r.json();return route.fulfill({json:{...data,canConfigure:false,emailConfigured:true,settings:{...data.settings,enabled:true},candidates}});}
  const b=route.request().postDataJSON(),c=candidates.find(c=>c.id===b.id)!;if(b.action==='approve')c.status='approved';else if(b.action==='reject')c.status='rejected';else if(b.action==='push'){expect(c.status).toBe('approved');c.status='issued';pushes++;}else throw new Error('Unexpected action');return route.fulfill({json:{ok:true}});
 });
 await page.getByRole('button',{name:'Loyalty',exact:true}).click();const queue=page.getByRole('region',{name:'Customers selected for loyalty'}),approved=queue.locator('article').filter({hasText:'approved@example.test'}),rejected=queue.locator('article').filter({hasText:'rejected@example.test'});
 await expect(approved.getByRole('button',{name:'Issue and email coupon'})).toHaveCount(0);await approved.getByRole('button',{name:'Approve',exact:true}).click();await expect(approved).toContainText('Approved · no coupon issued or emailed yet.');expect(pushes).toBe(0);
 await rejected.getByRole('button',{name:'Reject',exact:true}).click();await expect(rejected).toContainText('Status: rejected');await expect(rejected.getByRole('button')).toHaveCount(0);
 await approved.getByRole('button',{name:'Issue and email coupon'}).click();await expect(approved).toContainText('Status: issued');expect(pushes).toBe(1);await expect(approved.getByRole('button')).toHaveCount(0);await queue.screenshot({path:info.outputPath('candidate-approval.png')});
});
