import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('admin availability toggle saves sold-out state, rejects stale baskets and restores the item',async({page},testInfo)=>{
  const id='stock-test-'+randomUUID().slice(0,8),name='Stock test '+id;
  await page.goto('/admin');await page.getByLabel('Admin access code').fill(process.env.FOND_ADMIN_CODE!);await page.getByRole('button',{name:'Unlock',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Admin sections'})).toBeVisible();
  const created=await page.evaluate(async({id,name})=>{const response=await fetch('/api/admin/menu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name,price:1000,category:'All-Day Breakfast',description:'Isolated stock test'})});return {ok:response.ok,body:await response.text()};},{id,name});expect(created.ok,created.body).toBe(true);
  try{
    await page.reload();await page.getByPlaceholder('Search menu items…').fill(name);
    const toggle=page.getByRole('switch',{name:`Availability for ${name}`});
    await expect(toggle).toHaveAttribute('aria-checked','true');await expect(toggle).toHaveText('Available');
    await toggle.click();await expect(toggle).toHaveText('Sold out');await expect(toggle).toHaveAttribute('aria-checked','false');await expect(toggle).toHaveClass(/is-sold-out/);
    await page.reload();await page.getByPlaceholder('Search menu items…').fill(name);await expect(toggle).toHaveText('Sold out');
    const publicMenu=await(await page.request.get('/api/menu')).json();expect(publicMenu.menu.some((item:{id:string})=>item.id===id)).toBe(false);
    expect((await page.request.post('/api/orders',{headers:{'Idempotency-Key':randomUUID()},data:{customerName:'Stock check',contactNumber:'0821234567',collectionTime:'ASAP',lines:[{id,quantity:1}]}})).status()).toBe(400);
    await page.screenshot({path:testInfo.outputPath('sold-out-toggle.png'),fullPage:true});
    await toggle.click();await expect(toggle).toHaveText('Available');await expect(toggle).toHaveClass(/is-available/);
    expect((await(await page.request.get('/api/menu')).json()).menu.some((item:{id:string})=>item.id===id)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{await page.evaluate(id=>fetch('/api/admin/menu/'+id,{method:'DELETE'}),id);}
});

for(const [label,time,restaurantOpen] of [['Saturday morning','2026-10-03T10:00:00+02:00',true],['Saturday noon','2026-10-03T12:00:00+02:00',false],['Sunday','2026-10-04T10:00:00+02:00',false]] as const){
  test(`${label} follows the restaurant and Food Truck schedules`,async({page})=>{
    await page.clock.setFixedTime(new Date(time));
    await page.route('**/api/store',async route=>{const response=await route.fetch();const body=await response.json();body.open=restaurantOpen;Object.assign(body.settings,{enforceHours:true,openDays:[1,2,3,4,5,6],openingTime:'07:00',closingTime:'18:30',saturdayClosingTime:'12:00',foodTruckOpenDays:[1,2,3,4,5],foodTruckOpeningTime:'07:00',foodTruckClosingTime:'15:30'});await route.fulfill({response,json:body});});
    await page.goto('/');
    const add=page.getByRole('button',{name:'Add Smashed Avo',exact:true});
    if(restaurantOpen){
      await expect(add).toBeEnabled();await add.click();await page.getByRole('button',{name:/^Basket/}).click();
      await expect(page.getByText('Today only · Kitchen closes at 12:00.')).toBeVisible();
      await expect(page.getByLabel('Preferred collection time (today)').locator('option').last()).toContainText('12:00');await page.keyboard.press('Escape');
    }else await expect(add).toBeDisabled();
    await page.getByRole('tab',{name:'Food Truck',exact:true}).click();await page.getByRole('tab',{name:'Kotas',exact:true}).click();
    await expect(page.getByRole('button',{name:'Add Kota · Russian',exact:true})).toBeDisabled();
    await expect(page.getByText(/Mon, Tue, Wed, Thu, Fri · from 07:00/)).toBeVisible();
  });
}
