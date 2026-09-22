import {test,expect} from '@playwright/test';

test('lost order response can be retried with the same submission key',async({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Add Smashed Avo',exact:true}).click();
 await page.getByRole('button',{name:'Basket',exact:true}).click();
 await page.getByLabel(/Your name/).fill('Retry browser test');
 await page.getByLabel('Contact number').fill('0821234567');
 await page.getByLabel('Email address').fill('retry@example.test');
 const keys:string[]=[];const references:string[]=[];
 await page.route('**/api/orders',async route=>{
   if(route.request().method()!=='POST')return route.continue();
   keys.push(route.request().headers()['idempotency-key']);
   const response=await route.fetch();
   references.push((await response.json()).reference);
   if(keys.length===1)await route.abort();else await route.fulfill({response});
 });
 await page.getByRole('button',{name:'Send order to FOND'}).click();
 await expect(page.getByRole('button',{name:'Send order to FOND'})).toBeEnabled();
 await page.getByRole('button',{name:'Send order to FOND'}).click();
 await expect(page.getByText('Order sent to FOND.')).toBeVisible();
 expect(keys).toHaveLength(2);expect(keys[0]).toBeTruthy();expect(keys[1]).toBe(keys[0]);
 expect(references[0]).toBeTruthy();expect(references[1]).toBe(references[0]);
});

test('staff manual intake sends an idempotency key',async({page})=>{
 await page.goto('/staff');
 await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE!);
 await page.getByRole('button',{name:'Open order queue'}).click();
 await page.getByRole('button',{name:'Add order',exact:true}).click();
 await page.getByRole('dialog').getByLabel('No pickled red onion').check();
 await page.getByRole('button',{name:/Smashed Avo/}).click();
 await page.getByLabel('Name / table / desk').fill('Manual browser test');
 await page.getByRole('dialog').getByLabel('Contact number').fill('0821234567');
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/staff/orders')&&r.request().method()==='POST');
 await page.getByRole('dialog').getByRole('button',{name:'Add to queue'}).click();
 const response=await responsePromise;expect(response.status()).toBe(201);
 expect(response.request().headers()['idempotency-key']).toBeTruthy();
 expect(response.request().postDataJSON().lines[0].modifierIds).toHaveLength(1);
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByText('Manual browser test').first()).toBeVisible();
});

