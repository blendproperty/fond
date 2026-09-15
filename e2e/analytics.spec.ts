import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
test('analytics dashboard has honest empty states, filters and real order charts',async({page,request},testInfo)=>{
 const denied=await request.get('/api/admin/reports/overview');expect(denied.status()).toBe(401);
 await page.goto('/admin');await page.getByLabel('Admin access code').fill(process.env.FOND_ADMIN_CODE!);await page.getByRole('button',{name:'Unlock',exact:true}).click();await page.getByRole('button',{name:'Reports',exact:true}).click();await expect(page.getByRole('heading',{name:'Business overview'})).toBeVisible();
 await page.getByLabel('Report from').fill('2040-01-01');await page.getByLabel('Report to').fill('2040-01-02');await expect(page.getByText('Your reporting dashboard is ready.')).toBeVisible();await expect(page.getByText('Slow movers (on menu)')).toHaveCount(0);await page.screenshot({path:testInfo.outputPath('analytics-empty.png'),fullPage:true});
 const login=await request.post('/api/staff/login',{data:{code:process.env.FOND_STAFF_CODE}});const headers={Cookie:login.headers()['set-cookie'].split(';')[0]};
 const created=await request.post('/api/staff/orders',{headers:{...headers,'Idempotency-Key':randomUUID()},data:{customerName:'Analytics visual fixture',collectionTime:'ASAP',lines:[{id:'espresso-single',quantity:2}]}});expect(created.ok()).toBe(true);const {order}=await created.json();
 for(const status of ['ready','completed'])expect((await request.patch('/api/staff/orders/'+order.id,{headers,data:{status}})).ok()).toBe(true);
 await page.getByRole('button',{name:'30 days',exact:true}).click();await expect(page.getByRole('img',{name:/Completed order value by order date/})).toBeVisible();await expect(page.getByRole('cell',{name:'Espresso (Single)',exact:true})).toBeVisible();
 await page.getByLabel('Search report items').fill('no-match-xyz');await expect(page.getByText('No items match these filters.')).toBeVisible();await page.getByLabel('Search report items').fill('');
 await expect(page.getByRole('cell',{name:'Espresso (Single)',exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath('analytics-populated.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
