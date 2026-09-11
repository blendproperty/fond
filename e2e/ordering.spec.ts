import {test,expect} from '@playwright/test';
test('browse, adjust basket, preview and reorder without live submission',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:/Good food/})).toBeVisible();
 await page.getByRole('button',{name:'Add Avo & eggs on toast',exact:true}).click();
 await page.getByRole('tab',{name:'Lunch',exact:true}).click();await page.getByRole('button',{name:'Add Chicken & avo wrap',exact:true}).click();
 await page.getByRole('button',{name:/^Basket/}).click();
 await page.getByRole('button',{name:'Add one Avo & eggs on toast',exact:true}).click();
 await page.getByLabel('Preferred collection').selectOption('Lunch collection');
 await page.getByRole('button',{name:'Preview order',exact:true}).click();
 await expect(page.getByText('Your preview is ready.')).toBeVisible();await expect(page.getByText(/Nothing has been sent to FOND or Yoco/)).toBeVisible();
 await expect(page.getByRole('dialog')).toContainText(/205/);
 await page.getByRole('button',{name:'Back to the menu'}).click();await page.getByRole('button',{name:'My previews'}).click();await page.getByRole('button',{name:'Try this basket again'}).click();await expect(page.getByRole('dialog')).toContainText('Chicken & avo wrap');
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('PWA manifest and fail-closed order API',async({request})=>{
 const manifest=await request.get('/manifest.webmanifest');expect(manifest.ok()).toBeTruthy();expect((await manifest.json()).display).toBe('standalone');
 const result=await request.post('/api/orders',{data:{amount:1}});expect(result.status()).toBe(503);expect((await result.json()).code).toBe('ORDERING_NOT_ENABLED');
 for(const path of ['/icons/icon-192.png','/icons/icon-512.png','/sw.js','/offline.html'])expect((await request.get(path)).ok()).toBeTruthy();
});
test('offline navigation shows fallback without queuing orders',async({page,context})=>{
 await page.goto('/');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready; if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}));});
 await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'Back in a moment.'})).toBeVisible();await expect(page.getByText('Orders are never sent while offline.')).toBeVisible();
 await context.setOffline(false);
});
