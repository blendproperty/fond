import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('admin sections save customer, publish CMS, record receipts and create named staff',async({page,request},testInfo)=>{
 test.setTimeout(90000);
 const tag=randomUUID().slice(0,8);
 await page.goto('/admin');await page.getByLabel('Admin access code').fill(process.env.FOND_ADMIN_CODE!);await page.getByRole('button',{name:'Unlock',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'Admin sections'})).toBeVisible();await expect(page.getByText('soon',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Customers',exact:true}).click();await page.getByRole('button',{name:'Add customer',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Customer '+tag);await page.getByLabel('Email',{exact:true}).fill(tag+'@example.test');
 await page.getByRole('button',{name:'Save customer',exact:true}).click();await expect(page.getByRole('button',{name:new RegExp('Customer '+tag)})).toBeVisible();
 await page.getByRole('button',{name:'Marketing & CMS',exact:true}).click();await page.getByLabel('Announcement',{exact:true}).fill('Fresh food '+tag);
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status')).toContainText('Saved');
 await page.getByRole('button',{name:'Publish to website',exact:true}).click();await expect(page.getByRole('status')).toContainText('Saved');
 const store=await (await request.get('/api/store')).json();expect(store.content.announcement).toMatch(/^Fresh food/);
 // Create an actual isolated order, then reconcile it through the admin UI.
 const res=await request.post('/api/orders',{headers:{'Idempotency-Key':randomUUID()},data:{customerName:'Finance '+tag,contactNumber:'0821234567',collectionTime:'ASAP',lines:[{id:'espresso-single',quantity:1}]}});expect(res.status()).toBe(201);
 await page.getByRole('button',{name:'Finance',exact:true}).click();await expect(page.getByRole('heading',{name:'Record payment or refund'})).toBeVisible();
 const option=page.getByRole('combobox',{name:'Order',exact:true}).locator('option').filter({hasText:'Finance '+tag});
 await expect(option).toHaveCount(1);await page.getByRole('combobox',{name:'Order',exact:true}).selectOption((await option.getAttribute('value'))!);
 await page.getByLabel('Amount (R)',{exact:true}).fill(String((await res.json()).totalCents/100));await page.getByLabel('Unique receipt / reference').fill('receipt-'+tag);
 await page.getByRole('button',{name:'Record transaction'}).click();await expect(page.getByText('receipt-'+tag,{exact:false}).last()).toBeVisible();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Member name',{exact:true}).fill('Staff '+tag);await page.getByLabel('Username',{exact:true}).fill('staff'+tag);await page.getByLabel('Password (12+ characters)',{exact:true}).fill('local-test-password');
 await page.getByLabel('New order (minutes)',{exact:true}).fill('7');await page.getByRole('button',{name:'Save settings'}).click();await expect(page.getByRole('status')).toContainText('Saved');
 expect((await (await request.get('/api/store')).json()).settings.newOrderMinutes).toBe(7);
 await page.getByRole('button',{name:'Save team member'}).click();await expect(page.getByRole('button',{name:new RegExp('Staff '+tag)})).toBeVisible();
 const login=await request.post('/api/staff/login',{data:{username:'staff'+tag,password:'local-test-password'}});expect(login.status()).toBe(200);
 const headers={Cookie:login.headers()['set-cookie'].split(';')[0]};expect((await request.get('/api/staff/orders',{headers})).status()).toBe(200);expect((await request.get('/api/admin/manage/finance',{headers})).status()).toBe(401);
 await page.screenshot({path:testInfo.outputPath('settings.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('new management APIs and webhook reject anonymous or forged requests',async({request})=>{
 for(const section of ['settings','customers','finance','marketing','history'])expect((await request.get('/api/admin/manage/'+section)).status()).toBe(401);
 expect((await request.post('/api/admin/manage/team',{data:{name:'Bad'}})).status()).toBe(401);
 expect((await request.post('/api/payments/webhook',{data:{type:'payment.succeeded'}})).status()).toBe(401);
});
