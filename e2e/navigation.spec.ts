import {test,expect} from '@playwright/test';
test('published food menu is visible with the new sections, items and prices',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('tab',{name:'Buddha Bowls',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Buddha Bowls',exact:true}).click();
 const goddess=page.locator('.meal-card').filter({has:page.getByRole('heading',{name:'Golden Goddess Bowl'})});
 await expect(goddess).toContainText('R 120,00');
 await page.getByRole('tab',{name:'The Grill',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Rump Steak (280g)'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Rump Steak (250g)'})).toHaveCount(0);
 await page.getByRole('tab',{name:'Wraps',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Steak & Chimichurri Wrap'})).toBeVisible();
});
test('category arrows reveal hidden categories and installation instructions are prominent',async({page},testInfo)=>{
 await page.goto('/');const strip=page.getByRole('tablist',{name:'Menu category'});await expect(page.getByRole('button',{name:'Next menu categories'})).toBeEnabled();await page.getByRole('button',{name:'Next menu categories'}).click();await expect.poll(()=>strip.evaluate(el=>el.scrollLeft)).toBeGreaterThan(20);await expect(page.getByRole('button',{name:'Previous menu categories'})).toBeEnabled();
 await page.getByRole('tab',{name:'All-Day Breakfast',exact:true}).focus();await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Sides, Sauces & Add-Ons',exact:true})).toHaveAttribute('aria-selected','true');
 await page.getByRole('button',{name:'Install FOND',exact:true}).click();await expect(page.getByRole('dialog',{name:'Install FOND'})).toBeVisible();await expect(page.getByRole('heading',{name:'iPhone or iPad'})).toBeVisible();await page.screenshot({path:testInfo.outputPath('install-guide.png')});await page.getByRole('button',{name:'Close install instructions'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.locator('.install-feature').scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('install-panel.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('customer PWA fits a narrow Android screen without scaled or clipped controls',async({page},testInfo)=>{
 await page.setViewportSize({width:320,height:658});
 await page.goto('/');
 await expect(page.locator('.header .basket-button')).toBeHidden();
 await expect(page.getByRole('link',{name:'My account'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Track order'})).toBeVisible();
 const viewport=await page.evaluate(()=>({layout:document.documentElement.clientWidth,visual:visualViewport?.width??innerWidth,scroll:document.documentElement.scrollWidth}));
 expect(viewport.layout).toBeLessThanOrEqual(viewport.visual+1);
 expect(viewport.scroll).toBeLessThanOrEqual(viewport.visual+1);
 for(const selector of ['.header','nav','.category-navigation','[aria-label="Next menu categories"]','.mobile-basket']){
  const bounds=await page.locator(selector).evaluate(element=>{const rect=element.getBoundingClientRect();return{left:rect.left,right:rect.right,width:rect.width,visual:visualViewport?.width??innerWidth};});
  expect(bounds.left,`${selector} starts inside the screen`).toBeGreaterThanOrEqual(-1);
 expect(bounds.right,`${selector} ends inside the screen`).toBeLessThanOrEqual(bounds.visual+1);
 expect(bounds.width,`${selector} has visible width`).toBeGreaterThan(0);
 }
 await page.screenshot({path:testInfo.outputPath('android-320-home.png'),fullPage:true});
 await page.getByRole('button',{name:'Basket',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Your basket'});
 await expect(drawer).toBeVisible();
 const drawerBounds=await drawer.evaluate(element=>{const rect=element.getBoundingClientRect();return{left:rect.left,right:rect.right,visual:visualViewport?.width??innerWidth};});
 expect(drawerBounds.left).toBeGreaterThanOrEqual(-1);
 expect(drawerBounds.right).toBeLessThanOrEqual(drawerBounds.visual+1);
 await page.screenshot({path:testInfo.outputPath('android-320-pwa.png'),fullPage:true});
});
