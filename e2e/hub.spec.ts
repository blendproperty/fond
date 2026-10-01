import {test,expect} from '@playwright/test';
test('Hub destinations, real empty calendars and forms work on desktop and phones',async({page})=>{
  await page.goto('/hub');await expect(page.getByRole('heading',{name:'Your day. Your Midpoint.'})).toBeVisible();
  const destinations=page.getByRole('navigation',{name:'Choose a destination'});
  await expect(destinations.getByRole('link')).toHaveCount(4);
  await expect(destinations.getByRole('link',{name:/Functions/})).toHaveAttribute('href','/functions');
  await expect(page.getByRole('link',{name:'Grab a bite at FOND',exact:true})).toHaveCount(0);
  await expect(page.locator('.hub-app-shortcuts')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'AT POINT',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Gym events',exact:true})).toHaveAttribute('href','/gym/events');
  await expect(page.getByRole('link',{name:'Padel events',exact:true})).toHaveAttribute('href','/padel/events');
  await page.getByRole('navigation',{name:'Choose a destination'}).getByRole('link',{name:/Gym/}).click();
  await expect(page).toHaveURL(/\/gym$/);await page.getByRole('link',{name:'Midpoint Gym Sign up',exact:true}).click();
  await expect(page.getByLabel('ID or passport number')).toBeVisible();
  await page.getByLabel('First name',{exact:true}).fill('Example');await page.getByLabel('Surname',{exact:true}).fill('Applicant');
  await page.getByLabel('Email address',{exact:true}).fill('isolated@example.com');await page.getByLabel('Mobile number',{exact:true}).fill('0820000000');
  await page.getByLabel('ID or passport number').fill('SYNTHETIC-ONLY');await page.getByRole('checkbox').check();
  await page.route('**/api/hub/requests',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Temporary failure'})}));
  await page.getByRole('button',{name:'Send signup request'}).click();await expect(page.locator('main').getByRole('alert')).toHaveText('Temporary failure');await expect(page.getByLabel('First name',{exact:true})).toHaveValue('Example');
  await page.unroute('**/api/hub/requests');
  await page.route('**/api/hub/requests',route=>{const body=route.request().postDataJSON();expect(body.identity).toBe('SYNTHETIC-ONLY');expect(body.service).toBe('gym');expect(route.request().headers()['idempotency-key']).toBeTruthy();return route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'fixture-request'})});});
  await page.getByRole('button',{name:'Send signup request'}).click();await expect(page.getByText('REQUEST RECEIVED',{exact:true})).toBeVisible();await expect(page.getByLabel('ID or passport number')).toHaveCount(0);
  await page.goto('/gym/classes');await expect(page.getByText('The next dates are on their way.')).toBeVisible();await page.getByRole('button',{name:'Next month'}).click();
  await page.goto('/padel');await expect(page.getByRole('link',{name:'Midpoint Padel Book a court',exact:true})).toHaveAttribute('href','https://playtomic.com/clubs/midpoint-padel');
  for(const path of ['/hub','/gym','/gym/signup','/gym/classes','/gym/events','/padel','/padel/signup','/padel/events','/functions','/hub/manage']){
    await page.goto(path);await expect(page.locator('.hub-shell, .team-portal, .admin-login')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }
});
test('Hub management requires authentication and rejects foreign origins',async({request})=>{
  expect((await request.get('/api/hub/manage?service=gym')).status()).toBe(401);
  expect((await request.post('/api/hub/manage',{data:{service:'gym',action:'event'}})).status()).toBe(401);
  expect((await request.post('/api/hub/requests',{headers:{Origin:'https://unrelated.example'},data:{}})).status()).toBe(403);
  expect((await request.post('/api/hub/session',{headers:{Origin:'https://unrelated.example'},data:{username:'example',password:'dummy'}})).status()).toBe(403);
});

test('Hub app navigation returns from FOND and retains separate app launch routes',async({page,request})=>{
 await page.goto('/hub');
 await expect(page.getByRole('navigation',{name:'App navigation'}).getByRole('link',{name:'Home',exact:true})).toHaveAttribute('aria-current','page');
 await page.getByRole('navigation',{name:'Choose a destination'}).getByRole('link',{name:/FOND/}).click();
 await expect(page).toHaveURL(/\/fond$/);
 await expect(page.getByRole('button',{name:'Basket',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Back to Midpoint Hub',exact:true}).click();
 await expect(page).toHaveURL(/\/hub$/);
 await page.getByRole('navigation',{name:'App navigation'}).getByRole('link',{name:'Gym',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'App navigation'}).getByRole('link',{name:'Gym',exact:true})).toHaveAttribute('aria-current','page');
 const hub=await (await request.get('/hub/manifest.webmanifest')).json();expect(hub.start_url).toBe('/hub');expect(hub.display).toBe('standalone');
 const fond=await (await request.get('/manifest.webmanifest')).json();expect(fond.id).toBe('/');expect(fond.name).toContain('FOND');
});


test('Legal pages are reachable from Hub and FOND and readable on small screens',async({page})=>{
 await page.goto('/hub');
 await page.locator('footer').getByRole('link',{name:'Privacy policy',exact:true}).click();
 await expect(page.getByRole('heading',{level:1,name:'Privacy policy'})).toBeVisible();
 const article=page.getByRole('article',{name:'Privacy policy'});
 await expect(article.getByText(/registration 2016\/031577\/07/)).toBeVisible();
 await expect(article.getByRole('link',{name:/Mark Corbishley/})).toHaveAttribute('href','mailto:legal@blendproperty.co.za');
 await page.getByText('Jump to a section',{exact:true}).click();
 await page.getByRole('link',{name:'Your rights and complaints',exact:true}).click();
 await expect(page).toHaveURL(/#rights$/);
 await page.getByRole('navigation',{name:'Legal pages'}).getByRole('link',{name:'Terms and conditions'}).click();
 await expect(page.getByRole('heading',{level:1,name:'Terms and conditions'})).toBeVisible();
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  for(const path of ['/hub/privacy','/hub/terms','/fond']){
   await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }
 }
 await page.locator('footer').getByRole('link',{name:'Terms and conditions',exact:true}).click();
 await expect(page).toHaveURL(/\/hub\/terms$/);
 await page.getByRole('link',{name:'Midpoint Hub',exact:true}).click();
 await expect(page).toHaveURL(/\/hub$/);
});
