import {test,expect} from '@playwright/test';
test('homepage shares Midpoint branding, install help and genuine events',async({page},info)=>{
 await page.goto('/hub');
 await expect(page.getByRole('heading',{name:'AT POINT',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'What’s the plan?'})).toHaveCount(0);
 const image=page.locator('.hub-home-hero-image');await expect(image).toBeVisible();expect(await image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(page.locator('.hub-at-point img')).toHaveCount(0);await page.getByRole('link',{name:'View all'}).click();await expect(page.getByRole('heading',{name:'Upcoming at Midpoint.'})).toBeVisible();await page.getByRole('link',{name:'Home',exact:true}).first().click();
 await page.getByRole('button',{name:'Install Midpoint Hub',exact:true}).click();await expect(page.getByRole('dialog',{name:'Install Midpoint Hub'})).toBeVisible();await page.getByRole('button',{name:'Close install instructions'}).click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:info.project.name==='mobile'?390:1440,height:900});await page.screenshot({path:`hub-results/home-refresh-${info.project.name}.png`,fullPage:true});
 await page.goto('/fond');await expect(page.getByRole('button',{name:/Install Midpoint Hub|Install FOND/})).toHaveCount(0);
});
