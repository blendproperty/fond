import {test,expect} from '@playwright/test';
test('department ownership, signup, publishing and new home operate together',async({page,request,playwright,baseURL},info)=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:'Your day. Your Midpoint.'})).toBeVisible();
  expect((await(await request.get('/manifest.webmanifest')).json()).start_url).toBe('/fond');
  await page.goto('/?payment=return&reference=example');await expect(page).toHaveURL(/\/fond\?payment=return&reference=example$/);
  const login=await request.post('/api/admin/login',{data:{code:'isolated-hub-admin'}});expect(login.ok(),await login.text()).toBe(true);
  const suffix=`${Date.now()}-${info.project.name}`;
  const adminCookie=login.headers()['set-cookie'].split(';')[0];
  for(const role of ['gym','padel']){const response=await request.post('/api/admin/manage/team',{headers:{Cookie:adminCookie},data:{name:`Example ${role}`,username:`${role}-${suffix}`,role,active:true,password:'isolated-test-password'}});expect(response.ok(),await response.text()).toBe(true);}
  async function authenticated(role:string){const response=await request.post('/api/hub/session',{data:{username:`${role}-${suffix}`,password:'isolated-test-password'}});expect(response.ok(),await response.text()).toBe(true);return playwright.request.newContext({baseURL,extraHTTPHeaders:{Cookie:response.headers()['set-cookie'].split(';')[0]}});}
  const gym=await authenticated('gym'),padel=await authenticated('padel');
  try{
    for(const [client,role] of [[gym,'gym'],[padel,'padel']] as const){expect((await client.get(`/api/hub/manage?service=${role==='gym'?'padel':'gym'}`)).status()).toBe(403);expect((await client.get('/api/admin/menu')).status()).toBe(401);}
    const firstName=`Example ${suffix}`;
    await page.goto('/gym/signup');await page.getByLabel('First name',{exact:true}).fill(firstName);await page.getByLabel('Surname',{exact:true}).fill('Fixture');await page.getByLabel('Email address',{exact:true}).fill(`fixture-${suffix}@example.com`);await page.getByLabel('Mobile number',{exact:true}).fill('0820000000');await page.getByLabel('ID or passport number').fill('SYNTHETIC-PASSPORT');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send signup request'}).click();await expect(page.getByText('REQUEST RECEIVED',{exact:true})).toBeVisible();
    const gymData=await(await gym.get('/api/hub/manage?service=gym')).json(),padelData=await(await padel.get('/api/hub/manage?service=padel')).json();
    const saved=gymData.requests.find((r:any)=>r.details.firstName===firstName);expect(saved.details.identity).toBe('SYNTHETIC-PASSPORT');expect(padelData.requests.some((r:any)=>r.id===saved.id)).toBe(false);
    expect((await padel.post('/api/hub/manage',{data:{service:'gym',action:'status',id:saved.id,status:'completed'}})).status()).toBe(403);
    const title=`Example class ${suffix}`,starts=new Date(Date.now()+3600000).toISOString(),ends=new Date(Date.now()+7200000).toISOString();
    const event={service:'gym',action:'event',calendar:'gym-classes',title,description:'An isolated test fixture',location:'Example studio',startsAt:starts,endsAt:ends,published:false};
    expect((await gym.post('/api/hub/manage',{data:event})).ok()).toBe(true);const events=(await(await gym.get('/api/hub/manage?service=gym')).json()).events;const id=events.find((e:any)=>e.title===title).id;
    await page.goto(`/gym/interest/${id}`);await expect(page.getByRole('heading',{name:title})).toHaveCount(0);
    expect((await gym.post('/api/hub/manage',{data:{...event,id,published:true}})).ok()).toBe(true);
    await page.goto(`/gym/interest/${id}`);await expect(page.getByRole('heading',{name:title})).toBeVisible();
    expect((await padel.post('/api/hub/manage',{data:{...event,service:'padel',calendar:'padel-events',id}})).ok()).toBe(false);
    await page.goto('/hub/manage');await page.getByLabel('Team username').fill(`gym-${suffix}`);await page.getByLabel('Password',{exact:true}).fill('isolated-test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Signup & interest requests'})).toBeVisible();await expect(page.getByLabel('Service')).toHaveValue('gym');await expect(page.getByLabel('Service').locator('option')).toHaveCount(1);await page.getByText(`${firstName} Fixture · signup · new`,{exact:true}).click();await expect(page.locator('details').filter({hasText:firstName}).getByText('SYNTHETIC-PASSPORT',{exact:true})).toBeVisible();
    await page.screenshot({path:`test-results/hub-workspace-${info.project.name}.png`,fullPage:true});
    for(const width of [320,390,768]){await page.setViewportSize({width,height:850});for(const path of ['/','/gym','/padel','/gym/signup','/padel/signup','/gym/classes','/padel/events','/hub/manage']){await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${path} at ${width}px`).toBe(true);}}
    await page.goto('/');await page.screenshot({path:`test-results/hub-home-${info.project.name}.png`,fullPage:true});
    const signedOut=await gym.delete('/api/hub/session');expect(signedOut.ok()).toBe(true);
    expect(signedOut.headers()['set-cookie']).toContain('fond_admin=');
    expect((await gym.get('/api/hub/manage?service=gym')).status()).toBe(401);
  } finally {await gym.dispose();await padel.dispose();}
});
