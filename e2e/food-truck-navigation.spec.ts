import {test,expect} from '@playwright/test';

test('Food Truck sections are readable, responsive and keyboard accessible',async({page},info)=>{
  const widths=info.project.name==='mobile'?[320,390]:[768,1440];
  for(const width of widths){
    await page.setViewportSize({width,height:900});
    for(const route of ['/','/fond/menu']){
      await page.goto(route);
      const truck=page.getByRole('button',{name:'Food Truck menu',exact:true});
      await expect(truck).toBeVisible();
      await expect(page.getByRole('tab',{name:'Food Truck',exact:true})).toHaveCount(0);
      expect(await truck.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(238, 115, 40)');
      const truckBox=(await truck.boundingBox())!,collectionBox=(await page.locator('.fond-order-mode').boundingBox())!;
      expect(truckBox.height).toBeGreaterThanOrEqual(44);
      expect(truckBox.x).toBeLessThanOrEqual(collectionBox.x);
      expect(truckBox.y).toBeLessThanOrEqual(collectionBox.y);
      await page.getByRole('searchbox',{name:'Search the menu'}).fill('coffee');
      await truck.click();
      await expect(truck).toHaveAttribute('aria-pressed','true');
      await expect(page.getByRole('searchbox',{name:'Search the menu'})).toHaveValue('');
      await expect(page.locator('.fond-order-mode').getByRole('button',{name:'Collection',exact:true})).toHaveAttribute('aria-pressed','true');
      const nav=page.getByRole('tablist',{name:'Food Truck menu section'});
      const tabs=nav.getByRole('tab');
      await expect(tabs).toHaveCount(4);
      const geometry=await tabs.evaluateAll(elements=>elements.map(el=>({y:el.getBoundingClientRect().y,height:el.getBoundingClientRect().height,font:Number.parseFloat(getComputedStyle(el).fontSize),border:getComputedStyle(el).borderTopWidth})));
      expect(geometry.every(tab=>tab.height>=44&&tab.font>=14&&tab.border==='0px')).toBe(true);
      expect(geometry[1].y).toBe(geometry[0].y);
      expect(geometry[2].y>geometry[0].y).toBe(width<=600);
      await nav.getByRole('tab',{name:'Build Your Plate',exact:true}).focus();
      await page.keyboard.press('ArrowRight');
      const kotas=nav.getByRole('tab',{name:'Kotas',exact:true});
      await expect(kotas).toBeFocused();await expect(kotas).toHaveAttribute('aria-selected','true');
      await expect(page.getByRole('tabpanel',{name:'Food Truck · Kotas'})).toBeVisible();
      if(route==='/fond/menu'){
        await expect(page.getByRole('heading',{name:'Kotas',exact:true})).toBeVisible();
        await expect(page.locator('.fond-favourites')).toHaveCount(0);
      }
      expect(await kotas.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(await tabs.first().evaluate(el=>getComputedStyle(el).backgroundColor));
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await nav.scrollIntoViewIfNeeded();
      await page.screenshot({path:info.outputPath(`sections-${route==='/'?'legacy':'fond'}-${width}.png`)});
      await kotas.press('End');await expect(nav.getByRole('tab',{name:'Breakfast',exact:true})).toBeFocused();
      await page.keyboard.press('Home');await expect(tabs.first()).toBeFocused();
      if(route==='/fond/menu'){
        await page.getByRole('tab',{name:'All-Day Breakfast',exact:true}).click();
        await expect(page.locator('.fond-favourites')).toBeVisible();
        await expect(truck).toHaveAttribute('aria-pressed','false');
      }
    }
  }
});
