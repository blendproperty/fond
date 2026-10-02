import {test,expect} from '@playwright/test';
import {createHmac} from 'node:crypto';
function otp(secret:string){let bits=0,value=0;const bytes:number[]=[];for(const char of secret){value=value*32+'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);bits+=5;if(bits>=8){bytes.push(Math.floor(value/2**(bits-8))&255);bits-=8;value%=2**bits;}}const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
test('one team login enforces every role, two-factor and global sign-out',async({page,playwright,baseURL},info)=>{
 let bootstrap=await playwright.request.newContext({baseURL});const rootLogin=await bootstrap.post('/api/admin/login',{data:{code:'isolated-hub-admin'}});expect(rootLogin.ok()).toBe(true);await bootstrap.dispose();bootstrap=await playwright.request.newContext({baseURL,extraHTTPHeaders:{Cookie:rootLogin.headers()['set-cookie'].split(';')[0]}});
 const suffix=Date.now()+'-'+info.project.name,password='isolated-team-password';
 for(const role of ['super-admin','owner','manager','staff','gym','padel','functions']){const r=await bootstrap.post('/api/admin/manage/team',{data:{name:'Fixture '+role,username:role+suffix,role,active:true,password}});expect(r.ok(),await r.text()).toBe(true);}
 await bootstrap.dispose();
 for(const role of ['super-admin','owner','manager','staff','gym','padel','functions']){
 let c=await playwright.request.newContext({baseURL});async function signIn(data:Record<string,string>){const r=await c.post('/api/team/session',{data});if(r.ok()){const Cookie=r.headersArray().filter(h=>h.name.toLowerCase()==='set-cookie').map(h=>h.value.split(';')[0]).filter(v=>!v.endsWith('=')).join('; ');await c.dispose();c=await playwright.request.newContext({baseURL,extraHTTPHeaders:{Cookie}});}return r;}const credentials={username:role+suffix,password};
 expect((await c.post('/api/team/session',{headers:{Origin:'https://foreign.example'},data:credentials})).status()).toBe(403);
 expect((await signIn(credentials)).ok()).toBe(true);
 const all=['super-admin','owner'].includes(role);
 expect((await c.get('/api/admin/menu')).ok()).toBe(all||role==='manager');
 expect((await c.get('/api/hub/manage?service=gym')).ok()).toBe(all||role==='gym');
 expect((await c.get('/api/hub/manage?service=padel')).ok()).toBe(all||role==='padel');
 expect((await c.get('/api/functions/manage?month=2026-10')).ok()).toBe(all||role==='functions');
 expect((await c.get('/api/staff/orders')).ok()).toBe(all||['staff','manager'].includes(role));
 if(role==='owner'){
 const enrollment=await(await c.post('/api/hub/two-factor',{data:{action:'begin'}})).json();
 const activated=await c.post('/api/hub/two-factor',{data:{action:'activate',code:otp(enrollment.secret)}});expect(activated.ok()).toBe(true);
 await c.delete('/api/team/session');expect((await signIn(credentials)).status()).toBe(401);
 const recovery=(await activated.json()).recoveryCodes[0];expect((await signIn({...credentials,twoFactorCode:recovery})).ok()).toBe(true);
 await c.delete('/api/team/session');expect((await signIn({...credentials,twoFactorCode:recovery})).status()).toBe(401);
 }
 expect((await c.delete('/api/team/session')).ok()).toBe(true);
 for(const path of ['/api/team/session','/api/admin/menu','/api/hub/manage','/api/functions/manage?month=2026-10','/api/staff/orders'])expect((await c.get(path)).ok()).toBe(false);
 await c.dispose();
 }
 await page.goto('/admin');await expect(page.getByRole('img',{name:'Midpoint Hub',exact:true})).toBeVisible();await page.getByLabel('Team username').fill('super-admin'+suffix);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Your team workspace.'})).toBeVisible();
 const originalViewport=page.viewportSize();await expect.poll(()=>page.locator('.team-area-art > img').evaluateAll(images=>images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);await page.screenshot({path:`hub-results/team-overview-${info.project.name}.png`,fullPage:true});for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Team overview at ${width}px`).toBe(true);}if(originalViewport)await page.setViewportSize(originalViewport);
 for(const label of ['Gym','Padel','Functions'])await expect(page.locator('.team-areas').getByRole('link',{name:new RegExp('^'+label)})).toBeVisible();
 await page.locator('.team-areas').getByRole('button',{name:/^FOND/}).click();await expect(page.getByRole('button',{name:'Menu & specials',exact:true})).toBeVisible();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('heading',{name:'Trading & fulfilment',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Provider credentials · super admin'})).toHaveCount(0);await expect(page.getByRole('heading',{name:'Team & permissions'})).toHaveCount(0);await page.getByRole('button',{name:'All workspaces'}).click();await page.locator('.team-areas').getByRole('button',{name:/^Operations/}).click();await expect(page.getByRole('heading',{name:'Provider credentials · super admin'})).toBeVisible();await expect(page.getByRole('heading',{name:'Team & permissions'})).toBeVisible();await expect(page.getByRole('heading',{name:'Trading & fulfilment',exact:true})).toHaveCount(0);await page.screenshot({path:`hub-results/operations-${info.project.name}.png`,fullPage:true});await page.getByRole('button',{name:'All workspaces'}).click();
 await page.locator('.team-areas').getByRole('link',{name:/^Padel/}).click();await expect(page.getByLabel('Service',{exact:true})).toHaveValue('padel');await expect(page.getByRole('navigation',{name:'Padel workspace sections'})).toBeVisible();await page.screenshot({path:`hub-results/padel-workspace-${info.project.name}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('link',{name:'All workspaces',exact:true}).click();
 await page.locator('.team-areas').getByRole('link',{name:/^Functions/}).click();await expect(page.getByLabel('Month',{exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Functions workspace sections'})).toBeVisible();await page.screenshot({path:`hub-results/functions-workspace-${info.project.name}.png`,fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Welcome to your Hub.'})).toBeVisible();await page.goto('/hub/manage');await expect(page).toHaveURL(/admin\?next=/);await expect(page.getByLabel('Team username')).toBeVisible();
});
