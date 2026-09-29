import {test,expect} from '@playwright/test';
test('Hub destinations, real empty calendars and forms work on desktop and phones',async({page})=>{
  await page.goto('/hub');await expect(page.getByRole('heading',{name:'Your day. All at Midpoint.'})).toBeVisible();
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
  await page.goto('/padel');await expect(page.getByRole('link',{name:'Midpoint Padel Book a court',exact:true})).toHaveAttribute('href','https://playtomic.com/');
  for(const path of ['/hub','/gym','/gym/signup','/gym/classes','/gym/events','/padel','/padel/signup','/padel/events','/functions','/hub/manage']){
    await page.goto(path);await expect(page.locator('.hub-shell')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }
});
test('Hub management requires authentication and rejects foreign origins',async({request})=>{
  expect((await request.get('/api/hub/manage?service=gym')).status()).toBe(401);
  expect((await request.post('/api/hub/manage',{data:{service:'gym',action:'event'}})).status()).toBe(401);
  expect((await request.post('/api/hub/requests',{headers:{Origin:'https://unrelated.example'},data:{}})).status()).toBe(403);
  expect((await request.post('/api/hub/session',{headers:{Origin:'https://unrelated.example'},data:{username:'example',password:'dummy'}})).status()).toBe(403);
});
