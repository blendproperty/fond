import {test,expect,type Page} from '@playwright/test';
const reference='FOND-'+'A'.repeat(32),displayReference='FOND-7K3P-9Q8R';
const pin={latitude:-26.0010063,longitude:28.1237302,accuracy:15};
const result={reference,displayReference,status:'received',fulfillment:'delivery',totalCents:3200,collectionTime:'ASAP',estimatedPrepMinutes:4,updatedAt:new Date().toISOString(),estimatedArrivalAt:null,paymentMethod:'yoco_online',payment:{paidCents:0,checkout:null}};

async function deliveryBasket(page:Page){
  await page.clock.setFixedTime(new Date('2026-10-01T09:00:00+02:00'));
  await page.route('**/api/store',async route=>{const response=await route.fetch(),body=await response.json();body.open=true;body.onlinePayments=false;body.paymentMode='sandbox';body.settings.deliveryEnabled=true;body.settings.enforceHours=false;await route.fulfill({response,json:body});});
  await page.goto('/');
  await page.getByRole('button',{name:'Delivery',exact:true}).click();
  await page.getByRole('button',{name:'Add Smashed Avo',exact:true}).click();
  await page.getByRole('button',{name:/^Basket/}).click();
  await page.getByLabel('Business and building').selectOption('Blend Property Group | OnPoint Building · 2 Loerie');
  await page.getByLabel('Your name').fill('GPS fixture');
  await page.getByLabel('Contact number',{exact:true}).fill('0821234567');
}

test('GPS is optional, requires confirmation, reaches the order and clears for the next basket',async({page},info)=>{
  await page.context().grantPermissions(['geolocation']);await page.context().setGeolocation(pin);
  let posted:any;
  await page.route('**/api/orders',route=>{posted=route.request().postDataJSON();return route.fulfill({status:201,json:{...result}});});
  await page.route('**/api/orders?reference=*',route=>route.fulfill({json:result}));
  await deliveryBasket(page);
  await expect(page.getByText('Location found',{exact:false})).toHaveCount(0);
  await page.getByRole('button',{name:'Use my location'}).click();
  await expect(page.getByText(/Location found/)).toBeVisible();
  const preview=page.getByRole('link',{name:'Check pin in Google Maps'});
  expect(new URL((await preview.getAttribute('href'))!).searchParams.get('query')).toBe('-26.0010063,28.1237302');
  await page.getByRole('button',{name:'Send order to FOND'}).click();
  await expect(page.getByText('Confirm the delivery pin, or remove it to use your building details only.')).toBeVisible();expect(posted).toBeUndefined();
  await page.getByLabel('This is the correct delivery point. Include it with my order.').check();
  await page.getByRole('dialog').screenshot({path:info.outputPath('delivery-confirmed-pin.png')});
  await page.getByRole('button',{name:'Send order to FOND'}).click();
  await expect(page.getByText('Order sent to FOND.')).toBeVisible();expect(posted.paymentMethod).toBe('pay_at_collection');expect(posted.deliveryLocation).toEqual(pin);expect(posted.building).toBe('OnPoint Building · 2 Loerie');
  await page.getByRole('button',{name:'Back to the menu'}).click();
  await page.getByRole('button',{name:'Add Smashed Avo',exact:true}).click();await page.getByRole('button',{name:/^Basket/}).click();
  await expect(page.getByText(/Location found/)).toHaveCount(0);
  await page.keyboard.press('Escape');await page.reload();await page.getByRole('button',{name:'Track order'}).click();
  await expect(page.getByLabel('Order number')).toHaveValue(displayReference);await expect(page.getByLabel('Order number')).toHaveAttribute('readonly','');
});

test('declined permission keeps manual delivery available without a pin',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_success:unknown,error:(e:unknown)=>void)=>error({code:1})}});});
  let posted:any;await page.route('**/api/orders',route=>{posted=route.request().postDataJSON();return route.fulfill({status:201,json:result});});
  await deliveryBasket(page);await page.getByRole('button',{name:'Use my location'}).click();
  await expect(page.getByText('Location permission was declined. You can still order using your business and building.')).toBeVisible();
  await page.getByRole('button',{name:'Send order to FOND'}).click();await expect(page.getByText('Order sent to FOND.')).toBeVisible();expect(posted.deliveryLocation).toBeNull();
});

test('timeout and removed pending capture never attach a late pin',async({page})=>{
  await page.addInitScript(()=>{let calls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(success:(p:unknown)=>void,error:(e:unknown)=>void)=>{if(!calls++){error({code:3});return;}setTimeout(()=>success({coords:{latitude:-26,longitude:28,accuracy:20}}),300);}}});});
  await deliveryBasket(page);await page.getByRole('button',{name:'Use my location'}).click();await expect(page.getByText(/Finding your location timed out/)).toBeVisible();
  await page.getByRole('button',{name:'Use my location'}).click();await page.getByRole('button',{name:'Remove location'}).click();
  await page.waitForTimeout(500);await expect(page.getByText(/Location found/)).toHaveCount(0);await expect(page.getByRole('button',{name:'Use my location'})).toBeEnabled();
});

test('tracking keeps the original short number through closing, reload and payment return',async({page},info)=>{
  await page.route('**/api/orders?reference=*',route=>route.fulfill({json:result}));
  await page.goto('/');await page.getByRole('button',{name:'Track order'}).click();
  await page.getByLabel('Order number').fill(reference);await page.getByRole('button',{name:'Check status'}).click();
  await expect(page.getByLabel('Order number')).toHaveValue(displayReference);await expect(page.getByLabel('Order number')).toHaveAttribute('readonly','');
  await page.getByLabel('Order number').press('a');await expect(page.getByLabel('Order number')).toHaveValue(displayReference);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Track order'}).click();await expect(page.getByLabel('Order number')).toHaveValue(displayReference);
  await page.reload();await page.getByRole('button',{name:'Track order'}).click();await expect(page.getByLabel('Order number')).toHaveValue(displayReference);
  await page.getByRole('dialog').screenshot({path:info.outputPath('restored-tracking-number.png')});
  await page.getByRole('button',{name:'Track another order'}).click();await expect(page.getByLabel('Order number')).toBeEditable();await expect(page.getByLabel('Order number')).toHaveValue('');
  await page.getByRole('button',{name:displayReference,exact:true}).click();await expect(page.getByLabel('Order number')).toHaveValue(displayReference);
  await page.goto('/?payment=success&reference='+reference);await expect(page.getByLabel('Order number')).toHaveValue(displayReference);await expect(page.getByLabel('Order number')).toHaveAttribute('readonly','');
});

test('staff can open directions for a delivery pin while guests cannot retrieve coordinates',async({page,request})=>{
  const headers=(await request.get('/')).headers();expect(headers['permissions-policy']).toContain('geolocation=(self)');
  const collection=await request.post('/api/orders',{headers:{'Idempotency-Key':crypto.randomUUID()},data:{customerName:'Privacy fixture',contactNumber:'0821234567',lines:[{id:'espresso-single',quantity:1}],collectionTime:'ASAP',deliveryLocation:pin}});expect(collection.status()).toBe(400);
  const order={...result,id:'gps-staff-fixture',staffNumber:'123456',customerName:'GPS fixture',note:null,lines:[{id:'espresso-single',quantity:1,name:'Espresso (Single)'}],source:'customer',createdAt:new Date().toISOString(),contactNumber:'0821234567',company:'Blend Property Group',building:'OnPoint Building · 2 Loerie',posRequired:true,posRecordedAt:null,posReference:null,basketPrepMinutes:4,paymentRequired:true,deliveryLocation:pin};
  await page.route(/\/api\/staff\/orders(?:\?.*)?$/,route=>route.fulfill({json:{orders:[order]}}));
  await page.goto('/staff');await expect(page.getByRole('heading',{name:'Live order board'})).toBeVisible();await page.getByRole('tab',{name:/Awaiting Yoco payment confirmation/}).click();
  const directions=page.getByRole('link',{name:/Directions in Google Maps/});await expect(directions).toBeVisible();expect(new URL((await directions.getAttribute('href'))!).searchParams.get('destination')).toBe('-26.0010063,28.1237302');
  expect((await request.get('/api/staff/orders')).status()).toBe(401);
});
