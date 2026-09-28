import {test,expect} from '@playwright/test';

test('order history updates on return and recovers from a failed refresh',async({page},info)=>{
 let status='received',fail=false;
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:{id:'history',email:'customer@example.test',emailVerified:true}}}));
 await page.route('**/api/account/orders',r=>fail?r.fulfill({status:503,json:{message:'Unavailable'}}):r.fulfill({json:{orders:[{reference:'test-reference',displayReference:'FOND-HISTORY',status,createdAt:'2026-09-28T08:00:00Z',collectionTime:'ASAP',totalCents:3000,lines:[{name:'Cappuccino',quantity:1,subtotalCents:3000}],payment:{paidCents:3000}}]}}));
 await page.goto('/account');const order=page.getByRole('article');await expect(order).toContainText('received');
 status='ready';await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(order).toContainText('ready');
 fail=true;await page.getByRole('button',{name:'Refresh orders',exact:true}).click();await expect(page.getByRole('main').getByRole('alert')).toBeVisible();await expect(order).toContainText('FOND-HISTORY');await expect(page.getByText('No orders are linked to this account yet.',{exact:false})).not.toBeVisible();
 fail=false;status='completed';await page.getByRole('button',{name:'Refresh orders',exact:true}).click();await expect(order).toContainText('completed');await expect(page.getByRole('main').getByRole('alert')).not.toBeVisible();
 await page.screenshot({path:info.outputPath('account-history.png'),fullPage:true});
});

test('a failed initial history request does not masquerade as no orders',async({page})=>{
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:{id:'history',email:'customer@example.test',emailVerified:true}}}));
 await page.route('**/api/account/orders',r=>r.fulfill({status:503,json:{}}));
 await page.goto('/account');await expect(page.getByRole('main').getByRole('alert')).toBeVisible();await expect(page.getByText('Your order history could not be loaded.',{exact:false})).toBeVisible();await expect(page.getByText('No orders are linked to this account yet.',{exact:false})).not.toBeVisible();
});
