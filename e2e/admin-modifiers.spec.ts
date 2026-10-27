import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('manager adds optional extras and required choices without code, and customers receive them',async({page,request},info)=>{
  const id='modifier-editor-'+randomUUID().slice(0,8),name='Options '+id.slice(-8);
  expect((await request.post(`/api/admin/menu/${id}/modifiers`,{data:{name:'Unauthorised',price:0}})).status()).toBe(401);
  await page.goto('/admin');await page.getByLabel('Admin access code').fill(process.env.FOND_ADMIN_CODE!);await page.getByRole('button',{name:'Unlock',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Admin sections'})).toBeVisible();
  const result=await page.evaluate(async({id,name})=>{const response=await fetch('/api/admin/menu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name,price:1000,category:'Food Truck',description:'Isolated modifier editor test'})});return response.status;},{id,name});
  expect(result).toBe(201);
  try{
    await page.reload();await page.getByPlaceholder('Search menu items…').fill(name);await page.getByPlaceholder('Search menu items…').blur();await page.getByRole('button',{name:`Edit ${name}`,exact:true}).click();
    const row=page.locator('.admin-row').filter({has:page.getByRole('button',{name:`Remove ${name}`,exact:true})});
    for(const [option,price,group] of [['BBQ','0',''],['White bread','0','Bread choice'],['Brown bread','5','Bread choice']]){
      await row.getByLabel('Option name',{exact:true}).fill(option);
      await row.getByLabel('Option price (Rand)',{exact:true}).fill(price);
      await row.getByLabel('Required choice group (optional)',{exact:true}).fill(group);
      await row.getByRole('button',{name:'Add modifier',exact:true}).click();
      await expect(row.locator('.admin-modifier-row').filter({hasText:option})).toBeVisible();
      await expect(row.getByRole('button',{name:'Add modifier',exact:true})).toBeEnabled();
    }
    await row.getByLabel('Option name',{exact:true}).fill('Remove me');
    await row.getByLabel('Required choice group (optional)',{exact:true}).fill('');
    await row.getByRole('button',{name:'Add modifier',exact:true}).click();
    await row.getByRole('button',{name:'Remove Remove me',exact:true}).click();
    await expect(row.locator('.admin-modifier-row').filter({hasText:'Remove me'})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({path:info.outputPath('self-service-options.png'),fullPage:true});
    await page.route('**/api/store',async route=>{const response=await route.fetch();const body=await response.json();body.open=true;body.settings.enforceHours=false;await route.fulfill({response,json:body});});
    await page.goto('/fond/menu');await page.getByRole('searchbox',{name:'Search the menu'}).fill(name);
    await page.getByRole('button',{name:`View ${name}`,exact:true}).click();
    const dialog=page.getByRole('dialog',{name,exact:true}),add=dialog.getByRole('button',{name:/Add to basket/});
    await expect(add).toBeDisabled();await dialog.getByRole('radio',{name:'Brown bread (+R 5,00)',exact:true}).check();
    await dialog.getByRole('checkbox',{name:'BBQ',exact:true}).check();
    await expect(add).toBeEnabled();await expect(add).toContainText('15');await add.click();
    await page.getByRole('button',{name:'Basket',exact:true}).click();await expect(page.getByRole('dialog',{name:'Your basket'})).toContainText('Brown bread, BBQ');
  }finally{
    if(!page.isClosed()) await page.evaluate(async id=>{const response=await fetch('/api/admin/menu/'+id,{method:'DELETE'});if(!response.ok)throw new Error('Could not remove isolated editor fixture');},id);
  }
});
