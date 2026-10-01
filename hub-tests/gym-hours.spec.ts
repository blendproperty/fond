import {test,expect} from '@playwright/test';
import {GYM_DAYS} from '../src/lib/gym-hours';
test('Gym team can publish persistent hours; Padel, anonymous and invalid origins cannot',async({page,request,playwright,baseURL},info)=>{
 const suffix=Date.now()+'-'+info.project.name,owner=await request.post('/api/admin/login',{data:{code:'isolated-hub-admin'}}),ownerCookie=owner.headers()['set-cookie'].split(';')[0];
 for(const role of ['gym','padel'])expect((await request.post('/api/admin/manage/team',{headers:{Cookie:ownerCookie},data:{name:'Hours '+role,username:role+'-hours-'+suffix,role,active:true,password:'isolated-test-password'}})).ok()).toBe(true);
 const schedule=GYM_DAYS.map(day=>({day,status:day==='Sunday'?'closed':'open',opens:'06:00',closes:'18:00'}));
 const anon=await playwright.request.newContext({baseURL});expect((await anon.post('/api/hub/manage',{data:{service:'gym',action:'gym-hours',schedule}})).status()).toBe(401);await anon.dispose();
 await page.goto('/hub/manage');await page.getByLabel('Team username').fill('gym-hours-'+suffix);await page.getByLabel('Password',{exact:true}).fill('isolated-test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Gym opening hours',exact:true})).toBeVisible();
 for(const day of GYM_DAYS){await page.getByLabel(day+' status',{exact:true}).selectOption(day==='Sunday'?'closed':'open');if(day!=='Sunday'){await page.getByLabel(day+' opens',{exact:true}).fill('06:00');await page.getByLabel(day+' closes',{exact:true}).fill('18:00');}}
 await page.getByRole('button',{name:'Save opening hours',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Saved.');await page.reload();await expect(page.getByLabel('Monday opens',{exact:true})).toHaveValue('06:00');
 const cookie=(await page.context().cookies()).map(c=>c.name+'='+c.value).join('; '),gym=await playwright.request.newContext({baseURL,extraHTTPHeaders:{Cookie:cookie}});
 expect((await gym.post('/api/hub/manage',{headers:{Origin:'https://foreign.example'},data:{service:'gym',action:'gym-hours',schedule}})).status()).toBe(403);
 expect((await gym.post('/api/hub/manage',{data:{service:'gym',action:'gym-hours',schedule:schedule.map((r,i)=>i===0?{...r,closes:'05:00'}:r)}})).status()).toBe(400);await gym.dispose();
 await page.goto('/gym/info');const hours=page.getByRole('region',{name:'Gym opening hours'});await expect(hours.getByText('06:00 – 18:00',{exact:true})).toHaveCount(7);await expect(hours.getByText('Closed',{exact:true})).toBeVisible();
 await page.context().clearCookies();await page.goto('/hub/manage');await page.getByLabel('Team username').fill('padel-hours-'+suffix);await page.getByLabel('Password',{exact:true}).fill('isolated-test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Signup & interest requests'})).toBeVisible();
 const padel=await playwright.request.newContext({baseURL,extraHTTPHeaders:{Cookie:(await page.context().cookies()).map(c=>c.name+'='+c.value).join('; ')}});expect((await padel.post('/api/hub/manage',{data:{service:'gym',action:'gym-hours',schedule}})).status()).toBe(403);expect((await padel.post('/api/hub/manage',{data:{service:'padel',action:'gym-hours',schedule}})).status()).toBe(400);await padel.dispose();
});
