import {test,expect,type Page} from '@playwright/test';
import {categories,FOOD_TRUCK_SECTIONS} from '../src/lib/menu';

async function swipe(page:Page,dx:number,dy=0){
 const card=page.locator('.meal-grid .meal-card').first();await card.scrollIntoViewIfNeeded();const b=(await card.boundingBox())!,x=b.x+b.width/2,y=b.y+Math.min(70,b.height/2);
 const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let step=1;step<=8;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*step/8,y:y+dy*step/8}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
}
test('category taps and real finger swipes move one category, reveal the active tab and stop at both ends',async({page},info)=>{
 for(const route of ['/fond/menu','/']){
  await page.goto(route);await expect(page.locator('.meal-grid .meal-card').first()).toBeVisible();
  await swipe(page,100);await expect(page.getByRole('tab',{name:'All-Day Breakfast',exact:true})).toHaveAttribute('aria-selected','true');
  await swipe(page,-110);await expect(page.getByRole('tabpanel',{name:'Sandwiches',exact:true})).toBeVisible();await expect(page.getByRole('tab',{name:'Sandwiches',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.getByRole('dialog')).toHaveCount(0);
  await swipe(page,110);await expect(page.getByRole('tabpanel',{name:'All-Day Breakfast',exact:true})).toBeVisible();
  const last=categories.filter(c=>c!=='Food Truck').at(-1)!;await page.getByRole('tab',{name:last,exact:true}).click();await swipe(page,-110);await expect(page.getByRole('tabpanel',{name:last,exact:true})).toBeVisible();
  await swipe(page,110);const previous=categories.filter(c=>c!=='Food Truck').at(-2)!;await expect(page.getByRole('tabpanel',{name:previous,exact:true})).toBeVisible();const selected=page.getByRole('tab',{name:previous,exact:true});await expect(selected).toHaveAttribute('aria-selected','true');
  expect(await selected.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement!.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;})).toBe(true);
  if(route==='/fond/menu')await page.screenshot({path:info.outputPath('swipe-category-selected.png')});
 }
});
test('vertical and short gestures preserve the category, search does not swipe, and dish taps still open details',async({page})=>{
 await page.goto('/fond/menu');await expect(page.locator('.meal-grid .meal-card').first()).toBeVisible();
 await swipe(page,35);await expect(page.getByRole('tabpanel',{name:'All-Day Breakfast',exact:true})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0);
 const before=await page.evaluate(()=>scrollY);await swipe(page,10,-110);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before);await expect(page.getByRole('tabpanel',{name:'All-Day Breakfast',exact:true})).toBeVisible();
 await page.getByRole('searchbox',{name:'Search the menu'}).fill('coffee');await swipe(page,-110);await expect(page.getByRole('tabpanel',{name:'Menu search results',exact:true})).toBeVisible();await expect(page.getByRole('searchbox',{name:'Search the menu'})).toHaveValue('coffee');
 await page.getByRole('tab',{name:'All-Day Breakfast',exact:true}).click();await page.getByRole('button',{name:'View Smashed Avo',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
});
test('Food Truck finger swipes follow its sections without switching the main category',async({page})=>{
 await page.goto('/fond/menu');await page.getByRole('button',{name:'Food Truck menu',exact:true}).click();
 await swipe(page,-110);await expect(page.getByRole('tabpanel',{name:`Food Truck · ${FOOD_TRUCK_SECTIONS[1]}`,exact:true})).toBeVisible();await expect(page.getByRole('tab',{name:FOOD_TRUCK_SECTIONS[1],exact:true})).toHaveAttribute('aria-selected','true');
 await swipe(page,110);await expect(page.getByRole('tabpanel',{name:`Food Truck · ${FOOD_TRUCK_SECTIONS[0]}`,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Food Truck menu',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('dialog')).toHaveCount(0);
});
