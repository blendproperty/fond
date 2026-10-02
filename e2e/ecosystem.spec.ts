import {test,expect} from '@playwright/test';
test('direct visits retain Hub branding and installation identity',async({page,request})=>{
 for(const route of ['/functions','/functions/enquire','/functions/spaces','/functions/packages','/functions/michelle','/functions/gallery','/profile','/profile/orders','/profile/rewards','/profile/details','/profile/bookings','/profile/memberships','/profile/notifications','/profile/help','/car-wash','/suites']){
  await page.goto(route);
  await expect(page).toHaveTitle(/Midpoint Hub/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href','/hub/manifest.webmanifest');
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content','Midpoint Hub');await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content','black');await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content','#17221e');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href','/hub-assets/app-icon-192.png');
 }
 expect(await (await request.get('/hub/manifest.webmanifest')).json()).toMatchObject({id:'/hub',name:'Midpoint Hub',start_url:'/hub'});
 expect(await (await request.get('/manifest.webmanifest')).json()).toMatchObject({id:'/',name:'FOND Midpoint'});
});
test('inner headings have readable contrast against their actual background',async({page})=>{
 for(const route of ['/gym/membership','/gym/info','/gym/signup','/padel/prices','/padel/info','/padel/signup','/functions/enquire','/functions/spaces','/functions/packages','/functions/michelle','/functions/gallery','/profile','/profile/orders','/profile/rewards','/profile/details','/profile/help','/fond/hours']){
  await page.goto(route);
  const contrast=await page.getByRole('heading',{level:1}).evaluate(el=>{
   const luminance=(colour:string)=>{const rgb=(colour.match(/[\d.]+/g)??[]).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
   let parent:Element|null=el,background='rgb(255,255,255)';
   while(parent){const colour=getComputedStyle(parent).backgroundColor;if(colour!=='transparent'&&colour!=='rgba(0, 0, 0, 0)'){background=colour;break;}parent=parent.parentElement;}
   const foreground=luminance(getComputedStyle(el).color),back=luminance(background);return (Math.max(foreground,back)+.05)/(Math.min(foreground,back)+.05);
  });
  expect(contrast,route+' heading contrast').toBeGreaterThanOrEqual(4.5);
 }
});
test('service and profile screens share navigation, readable headings and responsive layout',async({page},info)=>{
 test.setTimeout(120000);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});for(const route of ['/padel','/padel/prices','/padel/info','/padel/signup','/padel/events','/functions','/functions/enquire','/functions/spaces','/functions/packages','/functions/michelle','/functions/gallery','/profile','/profile/orders','/profile/rewards','/profile/details','/profile/bookings','/profile/memberships','/profile/notifications','/profile/help']){await page.goto(route);await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' at '+width).toBe(true);await page.evaluate(()=>document.fonts.ready);const nav=page.getByRole('navigation',{name:'App navigation'});const bounds=await nav.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(845);await expect(nav.getByRole('link',{name:'Home',exact:true})).toBeVisible();await expect(nav.getByRole('link')).toHaveCount(6);await expect(nav.getByRole('link',{name:'Profile',exact:true})).toHaveAttribute('href','/profile');expect(await nav.locator('span').allTextContents()).toEqual(['HOME','FOND','GYM','PADEL','FUNCTIONS','PROFILE']);expect(await nav.evaluate(el=>Array.from(el.querySelectorAll('a')).map(a=>{const b=a.getBoundingClientRect(),s=a.querySelector('span')!.getBoundingClientRect();return {label:a.textContent,width:b.width,labelWidth:s.width,fits:s.left>=b.left-1&&s.right<=b.right+1};})),route+' nav labels at '+width).toEqual(expect.arrayContaining([expect.objectContaining({label:'FUNCTIONS',fits:true}),expect.objectContaining({label:'PROFILE',fits:true})]));}}
 await page.goto('/functions');await expect(page.locator('a[href="/functions/enquire"]')).toHaveCount(1);await page.getByRole('link',{name:'Plan an event',exact:true}).click();await expect(page.getByRole('button',{name:'Request this date'})).toBeVisible();await page.goto('/profile');await page.getByRole('link',{name:/Coffee rewards/}).click();await expect(page).toHaveURL(/profile\/rewards/);await page.goto('/fond');await expect(page.getByRole('link',{name:'Your profile & rewards'})).toHaveAttribute('href','/profile');await expect(page.locator('a[href="/rewards"]')).toHaveCount(0);
 await page.goto('/functions/michelle');await expect(page.getByRole('heading',{name:'Meet Michelle Strydom.',exact:true})).toHaveCount(1);await expect(page.locator('a[href="/functions/enquire"]')).toHaveCount(1);await page.screenshot({path:info.outputPath('michelle.png'),fullPage:true});
});
test('Profile shows only current account data and keeps real reward QR redemption',async({page})=>{
 let signed=true;await page.route('**/api/auth/session',r=>r.fulfill({json:{user:signed?{id:'fixture',email:'member@example.test',emailVerified:true}:null}}));await page.route('**/api/account/security',r=>r.fulfill({json:{enabled:false,channels:{},recoveryCodesRemaining:0}}));await page.route('**/api/account/rewards',r=>r.fulfill({json:{verified:true,environment:'test',stamps:7,stampsToNext:3,rewards:[{id:'reward-fixture',code:'FOND-TEST-FIXTURE',status:'available',kind:'earned'}],preferences:{email_enabled:false,sms_enabled:false}}}));await page.route('**/api/auth/logout',r=>{signed=false;return r.fulfill({json:{ok:true}});});
 await page.goto('/profile');await expect(page.getByText('member@example.test',{exact:true})).toBeVisible();await expect(page.getByText('Practice rewards · 1 reward available')).toBeVisible();await page.getByRole('link',{name:/Coffee rewards/}).click();await expect(page.locator('.coffee-ticket')).toContainText('7');await page.getByRole('button',{name:/Show.*code/i}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByAltText('Free coffee redemption QR code')).toBeVisible();await page.getByRole('button',{name:'Close reward code'}).click();await page.goto('/profile');await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();await expect(page.getByText('member@example.test',{exact:true})).toHaveCount(0);
});

