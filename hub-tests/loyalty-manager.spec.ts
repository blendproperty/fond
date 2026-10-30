import {test,expect} from '@playwright/test';

test('manager reaches every operational workspace and coupons while settings and privileged actions are denied',async({page,request,playwright,baseURL},info)=>{
 const login=await request.post('/api/admin/login',{data:{code:'isolated-hub-admin'}});const bootstrap=await playwright.request.newContext({baseURL,extraHTTPHeaders:{Cookie:login.headers()['set-cookie'].split(';')[0]}});
 const username=`approval-manager-${info.project.name}-${Date.now()}`,password='Isolated-manager-password';
 const created=await bootstrap.post('/api/admin/manage/team',{data:{name:'Fixture manager',username,password,role:'manager',active:true}});expect(created.ok(),await created.text()).toBe(true);
 await bootstrap.dispose();const session=await request.post('/api/team/session',{data:{username,password}});expect(session.ok()).toBe(true);const Cookie=session.headersArray().filter(h=>h.name.toLowerCase()==='set-cookie').map(h=>h.value.split(';')[0]).filter(v=>!v.endsWith('=')).join('; ');const manager=await playwright.request.newContext({baseURL,extraHTTPHeaders:{Cookie}});
 await page.goto('/admin');await page.getByLabel('Team username').fill(username);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('button',{name:'FOND workspace',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Operations workspace',exact:true})).toHaveCount(0);
 for(const workspace of ['Gym workspace','Padel workspace','Functions workspace'])await expect(page.getByRole('link',{name:workspace,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'FOND workspace',exact:true}).click();await expect(page.getByRole('button',{name:'Settings',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Loyalty',exact:true}).click();const panel=page.getByRole('region',{name:'Loyalty coupons · testing'});
 await expect(panel.getByRole('heading',{name:'Customers selected for loyalty'})).toBeVisible();await expect(panel.getByLabel('Enable loyalty candidate selection')).toBeDisabled();await expect(panel.getByRole('button',{name:'Save coupon automation'})).toHaveCount(0);await expect(panel.getByRole('button',{name:'Create test coupons'})).toBeDisabled();
 for(const endpoint of ['/api/admin/coupons','/api/admin/menu','/api/admin/manage/customers','/api/admin/manage/finance','/api/hub/manage?service=gym','/api/hub/manage?service=padel','/api/functions/manage?month=2026-10'])expect((await manager.get(endpoint)).status(),endpoint).toBe(200);
 expect((await manager.get('/api/admin/manage/settings')).status()).toBe(403);
 for(const endpoint of ['/api/admin/manage/settings','/api/admin/manage/team','/api/admin/manage/rollback-change','/api/admin/provider-credentials','/api/admin/counter-rewards'])expect((await manager.post(endpoint,{data:{action:'save',role:'super-admin'}})).status(),endpoint).toBe(403);
 expect((await manager.post('/api/admin/coupons',{data:{action:'settings',enabled:true,days:2,percent:10,amountCents:0,validDays:30}})).status()).toBe(403);
 for(const action of ['approve','reject','push'])expect((await manager.post('/api/admin/coupons',{data:{action,id:'missing-test-candidate'}})).status()).toBe(400);
 expect((await manager.post('/api/admin/coupons',{headers:{Origin:'https://foreign.example'},data:{action:'approve',id:'missing-test-candidate'}})).status()).toBe(403);
 await panel.screenshot({path:info.outputPath('manager-loyalty.png')});await manager.dispose();
});

