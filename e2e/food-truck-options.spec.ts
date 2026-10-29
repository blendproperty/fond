import {test,expect} from '@playwright/test';

test('Food Truck dialog requires one relish and keeps multiple chip preferences in the basket',async({page},info)=>{
  await page.route('**/api/store',async route=>{const response=await route.fetch();const body=await response.json();body.open=true;body.settings.enforceHours=false;await route.fulfill({response,json:body});});
  await page.goto('/fond/menu');
  await page.getByRole('button',{name:'Food Truck menu',exact:true}).click();
  await page.getByRole('tab',{name:'Kotas',exact:true}).click();
  await page.getByRole('button',{name:'Add Kota · Russian',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Kota · Russian',exact:true});
  const add=dialog.getByRole('button',{name:/Add to basket/});
  await expect(add).toBeDisabled();
  await dialog.getByRole('radio',{name:'Kota: Dry (no relish)',exact:true}).check();
  await dialog.getByRole('radio',{name:'Kota: Atchar',exact:true}).check();
  await expect(dialog.getByRole('radio',{name:'Kota: Dry (no relish)',exact:true})).not.toBeChecked();
  await dialog.getByLabel('Chips: BBQ',{exact:true}).check();
  await dialog.getByLabel('Chips: Salt',{exact:true}).check();
  await expect(add).toContainText('40');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('food-truck-options.png')});
  await add.click();
  await page.getByRole('button',{name:'Basket',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Your basket'})).toContainText('Kota: Atchar, Chips: BBQ, Chips: Salt');
});

test('staff counter requires a relish and saves the exact preparation choices on the order',async({page})=>{
  await page.goto('/staff');
  await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE!);
  await page.getByRole('button',{name:'Open order queue'}).click();
  await expect(page.locator('.staff-sync')).toBeVisible();
  await page.getByRole('button',{name:'Add order',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'Add order manually'});
  await panel.getByLabel('Jump to category').selectOption('Food Truck');
  await panel.getByRole('tab',{name:'Kotas',exact:true}).click();
  const item=panel.locator('.staff-item').filter({has:page.getByRole('button',{name:'Add Kota · Russian',exact:true})});
  await expect(item.getByRole('button',{name:'Add Kota · Russian',exact:true})).toBeDisabled();
  await item.getByRole('radio',{name:'Kota: Chakalaka',exact:true}).check();
  await item.getByLabel('Chips: Peri-peri',{exact:true}).check();
  await item.getByRole('button',{name:'Add Kota · Russian',exact:true}).click();
  await expect(panel.locator('.staff-cart')).toContainText('Kota: Chakalaka');
  await expect(panel.locator('.staff-cart')).toContainText('Chips: Peri-peri');
  const result=await page.evaluate(async()=>{
    const response=await fetch('/api/staff/orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({customerName:'Isolated modifier check',contactNumber:'0821234567',collectionTime:'As soon as possible',lines:[{id:'truck-kota-russian',quantity:1,modifierIds:['truck-kota-chakalaka','truck-chips-peri-peri']}]})});
    return {status:response.status,body:await response.json()};
  });
  expect(result.status).toBe(201);
  expect(result.body.order.lines[0].modifiers.map((mod:{name:string})=>mod.name)).toEqual(['Kota: Chakalaka','Chips: Peri-peri']);
  expect(result.body.order.totalCents).toBe(4000);
});

test('reordering a legacy kota preserves other items and asks for fresh choices',async({page})=>{
  await page.route('**/api/account/orders',route=>route.fulfill({json:{orders:[{reference:'old-kota',lines:[{id:'truck-kota-russian',quantity:1},{id:'espresso-single',quantity:1}]}]}}));
  await page.goto('/fond/menu?reorder=old-kota');
  await expect(page.getByRole('status').filter({hasText:'need new choices'})).toBeVisible();
  await page.getByRole('button',{name:'Basket',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Your basket'}).locator('.cart-line')).toHaveCount(1);
  await expect(page.getByRole('dialog',{name:'Your basket'})).toContainText('Espresso');
});
