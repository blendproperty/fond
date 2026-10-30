import {test,expect} from '@playwright/test';
test('management creates a batch of test coupons, previews emails, switches automation and revokes',async({page,request},info)=>{
 expect((await request.get('/api/admin/coupons')).status()).toBe(403);
 expect((await request.post('/api/admin/coupons',{data:{action:'settings'}})).status()).toBe(403);
 await page.goto('/admin');await page.getByLabel('Admin access code').fill(process.env.FOND_ADMIN_CODE!);await page.getByRole('button',{name:'Unlock',exact:true}).click();await page.getByRole('button',{name:'Marketing & CMS',exact:true}).click();
 const panel=page.getByRole('region',{name:'Loyalty coupons · testing'});
 await expect(panel.getByLabel('Enable automated test coupons')).toBeVisible();
 await panel.getByLabel('Enable automated test coupons').check();await panel.getByLabel('Consecutive purchase days').fill('5');await panel.getByRole('button',{name:'Save coupon automation'}).click();await expect(panel.getByRole('status')).toHaveText('Saved.');
 await panel.getByLabel('Enable automated test coupons').uncheck();await panel.getByRole('button',{name:'Save coupon automation'}).click();await expect(panel.getByRole('status')).toHaveText('Saved.');await expect(panel.getByLabel('Enable automated test coupons')).not.toBeChecked();
 const email=`loyalty-${info.project.name}-${Date.now()}@example.test`;
 await panel.getByLabel('Recipient email addresses').fill(`${email},second-${email}`);await panel.getByLabel('Coupon reason').fill('Isolated browser coupon test');await panel.getByLabel('Manual percentage').fill('15');await panel.getByLabel('Manual saving (Rand)').fill('20');await panel.getByRole('button',{name:'Create test coupons'}).click();await expect(panel.getByRole('status')).toContainText('Test coupons created');
 const coupon=panel.locator('article').filter({has:page.getByText(email,{exact:true})});await expect(coupon).toContainText('available');await coupon.getByText('Preview coupon email',{exact:true}).click();await expect(coupon).toContainText('15% off');await expect(coupon).toContainText('R20.00 off');await expect(coupon).toContainText('TEST ONLY');
 await panel.screenshot({path:info.outputPath('loyalty-coupons-management.png')});
 await coupon.getByRole('button',{name:'Revoke unused coupon'}).click();await expect(coupon).toContainText('revoked');
 const invalidOrigin=await page.evaluate(async()=>{const r=await fetch('/api/admin/coupons',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'settings',enabled:'yes'})});return r.status;});expect(invalidOrigin).toBe(400);
});
test('customer test coupon is clearly labelled separately from coffee and has no send control',async({page},info)=>{
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:{id:'fixture',email:'coupon@example.test',emailVerified:true}}}));await page.route('**/api/account/orders',r=>r.fulfill({json:{orders:[]}}));
 await page.route('**/api/account/rewards',r=>r.fulfill({json:{verified:true,environment:'test',stamps:0,stampsToNext:10,rewards:[{id:'coupon-fixture',code:'COUPON-TEST123',kind:'coupon-manual',status:'available',percent:15,amount_cents:2000,expires_at:'2026-12-31T00:00:00Z'}],preferences:{email_enabled:0,sms_enabled:0,phone:''}}}));
 await page.goto('/rewards');const coupon=page.locator('.reward-card').filter({hasText:'COUPON-TEST123'});await expect(coupon).toContainText('15% + R20.00 saving');await expect(coupon).toContainText('TEST ONLY');await expect(coupon.getByRole('button',{name:'Email / SMS this code'})).toHaveCount(0);await expect(coupon.getByRole('button',{name:'Show code to staff'})).toHaveCount(0);await page.screenshot({path:info.outputPath('loyalty-coupon-customer.png'),fullPage:true});
});
