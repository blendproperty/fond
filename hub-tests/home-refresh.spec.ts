import {test,expect} from '@playwright/test';
test('homepage shares Midpoint branding, install help and genuine events',async({page},info)=>{
 await page.goto('/hub');
 await expect(page.getByRole('heading',{name:'AT THE HUB',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'What’s the plan?'})).toHaveCount(0);
 const image=page.locator('.hub-home-hero-image');await expect(image).toBeVisible();expect(await image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await expect(page.locator('.hub-at-point img')).toHaveCount(0);await page.getByRole('link',{name:'View all'}).click();await expect(page.getByRole('heading',{name:'Upcoming at Midpoint.'})).toBeVisible();await page.getByRole('link',{name:'Home',exact:true}).first().click();
 await page.getByRole('button',{name:'Install Midpoint Hub',exact:true}).click();await expect(page.getByRole('dialog',{name:'Install Midpoint Hub'})).toBeVisible();await page.getByRole('button',{name:'Close install instructions'}).click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.setViewportSize({width:info.project.name==='mobile'?390:1440,height:900});await page.screenshot({path:`hub-results/home-refresh-${info.project.name}.png`,fullPage:true});
 await page.goto('/fond');await expect(page.getByRole('button',{name:/Install Midpoint Hub|Install FOND/})).toHaveCount(0);
});

test('Home FOND hours refresh from trading settings and clear stale status on failure',async({page})=>{
 await page.clock.install({time:new Date('2026-10-01T08:00:00Z')});
 let closing='18:30',paused=false,failed=false;
 await page.route('**/api/store',route=>failed?route.fulfill({status:503,body:'Unavailable'}):route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({settings:{openingTime:'07:00',closingTime:closing,saturdayClosingTime:'12:00',openDays:[1,2,3,4,5,6],orderingEnabled:!paused,enforceHours:true}})}));
 await page.goto('/hub');const status=page.locator('.hub-fond-hours');await expect(status).toContainText('FOND open until 18:30');
 closing='17:00';await page.clock.runFor(60000);await expect(status).toContainText('FOND open until 17:00');
 paused=true;await page.clock.runFor(60000);await expect(status).toContainText('FOND ordering paused');
 failed=true;await page.clock.runFor(60000);await expect(status).toContainText('FOND opening hours unavailable');
});
