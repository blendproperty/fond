import {test,expect} from '@playwright/test';
test('coffee redemption and manual order drawers cover the tablet stage navigation',async({page},info)=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/staff');await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE!);await page.getByRole('button',{name:'Open order queue'}).click();
 for(const action of ['Redeem coffee','Add order']){
  await page.getByRole('button',{name:action,exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'Add order manually'});await expect(drawer).toBeVisible();
  expect(await page.locator('.staff-stage-navigation').evaluate(el=>{
   const r=el.getBoundingClientRect();return [r.left+20,r.right-30].every(x=>document.elementFromPoint(x,r.top+r.height/2)?.closest('.staff-order-overlay'));
  })).toBe(true);
  if(action==='Redeem coffee')await page.screenshot({path:info.outputPath('redeem-landscape.png')});
  await drawer.getByRole('button',{name:'Close',exact:true}).click();await expect(drawer).not.toBeVisible();
 }
});
