import {test,expect} from '@playwright/test';

test('staff can scroll categories and add food and coffee to the same basket',async({page},info)=>{
 await page.goto('/staff');await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE!);await page.getByRole('button',{name:'Open order queue'}).click();
 await page.getByRole('button',{name:'Add order',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Add order manually'}),strip=drawer.getByRole('tablist',{name:'Menu category',exact:true});
 await drawer.getByRole('button',{name:'Add Smashed Avo',exact:true}).click();
 await expect(drawer.getByRole('button',{name:'Next menu categories'})).toBeEnabled();await drawer.getByRole('button',{name:'Next menu categories'}).click();
 await expect.poll(()=>strip.evaluate(el=>el.scrollLeft)).toBeGreaterThan(20);
 await drawer.getByRole('button',{name:'Previous menu categories'}).click();await expect.poll(()=>strip.evaluate(el=>el.scrollLeft)).toBeLessThan(3);
 if(info.project.name==='mobile'){
  const bounds=await strip.boundingBox();expect(bounds).not.toBeNull();const cdp=await page.context().newCDPSession(page);
  const y=bounds!.y+bounds!.height/2,start=bounds!.x+bounds!.width-20,end=bounds!.x+20;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
  for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*step/8,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>strip.evaluate(el=>el.scrollLeft)).toBeGreaterThan(20);await cdp.detach();
 }
 await drawer.getByLabel('Jump to category').selectOption('Coffee');
 await expect(drawer.getByRole('tabpanel',{name:'Coffee',exact:true})).toBeVisible();
 const coffee=drawer.getByRole('tab',{name:'Coffee',exact:true});
 expect(await coffee.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;})).toBe(true);
 await drawer.getByRole('button',{name:'Add Espresso (Single)',exact:true}).click();
 await expect(drawer.locator('.staff-cart')).toContainText('Smashed Avo');await expect(drawer.locator('.staff-cart')).toContainText('Espresso (Single)');
 await drawer.getByLabel('Jump to category').selectOption('Food Truck');
 const sections=drawer.getByRole('tablist',{name:'Food Truck menu section'});
 for(const tab of await sections.getByRole('tab').all()){expect(await tab.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})).toBe(true);await tab.click();await expect(tab).toHaveAttribute('aria-selected','true');}
 await drawer.getByLabel('Jump to category').selectOption('All-Day Breakfast');await expect(drawer.locator('.staff-cart')).toContainText('Espresso (Single)');
 await page.screenshot({path:info.outputPath('staff-menu-categories.png'),fullPage:true});
 await page.setViewportSize({width:320,height:740});expect(await drawer.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await drawer.getByLabel('Jump to category').selectOption('Coffee');await expect(drawer.getByRole('button',{name:'Add Espresso (Single)',exact:true})).toBeVisible();
 await drawer.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Redeem coffee',exact:true}).click();
 const redeem=page.getByRole('dialog',{name:'Add order manually'});
 await expect(redeem.getByLabel('Jump to category')).toHaveValue('Coffee');
 expect(await redeem.getByRole('tab',{name:'Coffee',exact:true}).evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!.getBoundingClientRect();return r.left>=p.left-1&&r.right<=p.right+1;})).toBe(true);
});
