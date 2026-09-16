import {test,expect} from '@playwright/test';
test('browse, adjust basket, place order and track it',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:/Good food/,level:1})).toBeVisible();
 await expect(page.locator('.meal-card').filter({has:page.getByRole('heading',{name:'Smashed Avo'})}).getByText(/Approx\. \d+ min/)).toBeVisible();
 await page.getByRole('button',{name:'Add Smashed Avo',exact:true}).click();
 await page.getByRole('button',{name:/^Basket/}).click();
 await expect(page.getByRole('tab',{name:'Delivery'})).toBeDisabled();
 await expect(page.getByText(/Online payment is currently unavailable/)).toBeVisible();
 await page.getByRole('button',{name:'Add one Smashed Avo',exact:true}).click();
 await page.getByLabel('Preferred collection').selectOption('Lunch collection');
 await page.getByLabel(/Your name/).fill('Playwright Test');
 await page.getByLabel('Contact number').fill('0821234567');
 await page.getByRole('button',{name:'Send order to FOND'}).click();
 await expect(page.getByText('Order sent to FOND.')).toBeVisible();
 await expect(page.getByRole('dialog')).toContainText(/240/);
 await page.getByRole('button',{name:'Back to the menu'}).click();
 await page.getByRole('button',{name:'Track order'}).click();
 await expect(page.getByRole('dialog')).toContainText('FOND-');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('PWA manifest and order API validation',async({request})=>{
 const manifest=await request.get('/manifest.webmanifest');expect(manifest.ok()).toBeTruthy();expect((await manifest.json()).display).toBe('standalone');
 const result=await request.post('/api/orders',{data:{amount:1}});expect(result.status()).toBe(400);
 for(const path of ['/icons/icon-192.png','/icons/icon-512.png','/sw.js','/offline.html'])expect((await request.get(path)).ok()).toBeTruthy();
});
test('offline navigation shows fallback without queuing orders',async({page,context})=>{
 await page.goto('/');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready; if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
 await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Back in a moment.'})).toBeVisible();await expect(page.getByText('Orders are never sent while offline.')).toBeVisible();
 await context.setOffline(false);
});
test('staff tablet requires the access code and shows the queue',async({page})=>{
 await page.goto('/staff');
 await expect(page.getByRole('heading',{name:'Ready for service.'})).toBeVisible();
 await page.getByLabel('Sign in with a named account').check();
 await expect(page.getByLabel('Username')).toBeVisible();
 await expect(page.getByLabel('Password')).toBeVisible();
 await expect(page.getByLabel('Authenticator or recovery code')).toBeVisible();
 await page.getByLabel('Sign in with a named account').uncheck();
 await expect(page.getByLabel('Authenticator or recovery code')).toHaveCount(0);
 await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE ?? '000000');
 await page.getByRole('button',{name:'Open order queue'}).click();
 await expect(page.getByRole('heading',{name:'Live order board'})).toBeVisible();
});

test('menu add-ons update the basket and collection needs a contact number',async({page,request})=>{
 await page.goto('/');
 await page.getByRole('tab',{name:'Smoothies'}).click();
 const smoothie=page.locator('.meal-card').filter({has:page.getByRole('heading',{name:'Tropical Gold'})});
 await smoothie.getByLabel('Add protein powder').check();
 await smoothie.getByRole('button',{name:'Add Tropical Gold'}).click();
 await page.getByRole('button',{name:/^Basket/}).click();
 await expect(page.getByText('Add protein powder').last()).toBeVisible();
 await page.getByLabel(/Your name/).fill('Modifier browser test');
 await page.getByRole('button',{name:'Send order to FOND'}).click();
 await expect(page.getByText('Enter a contact number so FOND can reach you about your order.')).toBeVisible();
 const rejected=await request.post('/api/orders',{headers:{'Idempotency-Key':crypto.randomUUID()},data:{customerName:'Missing phone',collectionTime:'ASAP',lines:[{id:'tropical-gold',quantity:1}]}});
 expect(rejected.status()).toBe(400);
});
