import {test,expect} from '@playwright/test';
import {createHmac,randomUUID} from 'node:crypto';
function otp(secret:string){let bits=0,value=0;const bytes:number[]=[];for(const char of secret){value=value*32+'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);bits+=5;if(bits>=8){bytes.push(Math.floor(value/2**(bits-8))&255);bits-=8;value%=2**bits;}}const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}

test('admin chooses to skip, enable and turn off two-factor sign-in',async({page,request},info)=>{
 const bootstrap=await request.post('/api/admin/login',{data:{code:'isolated-hub-admin'}});
 expect(bootstrap.ok()).toBe(true);
 const username='optional-'+randomUUID().slice(0,8),password='isolated-admin-password';
 const created=await request.post('/api/admin/manage/team',{headers:{Cookie:bootstrap.headers()['set-cookie'].split(';')[0]},data:{name:'Optional fixture',username,role:'owner',active:true,password}});
 expect(created.ok()).toBe(true);
 await page.goto('/admin');
 await expect(page.getByText(/Optional: leave blank/)).toBeVisible();
 async function login(){await page.getByLabel('Team username').fill(username);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('heading',{name:'Your team workspace.'})).toBeVisible();}
 async function security(){await page.getByRole('button',{name:'Operations workspace',exact:true}).click();await expect(page.getByRole('heading',{name:'Two factor sign-in'})).toBeVisible();}
 await login();await security();
 await expect(page.getByText(/optional and currently off/)).toBeVisible();
 await page.getByRole('button',{name:'Set up authenticator'}).click();
 await page.getByRole('button',{name:'Skip for now'}).click();
 await expect(page.getByRole('status')).toContainText('2FA remains off');
 await page.getByRole('button',{name:'Set up authenticator'}).click();
 await page.getByText('Using the same phone? Enter a setup key instead').click();
 const secret=await page.getByLabel('Manual setup key').inputValue();
 await page.getByLabel('Six digit code').fill(otp(secret));
 await page.getByRole('button',{name:'Verify and enable 2FA'}).click();
 await expect(page.getByText('Two-factor sign-in is on. You can choose to turn it off for your account.')).toBeVisible();
 for(const endpoint of ['/api/admin/two-factor','/api/hub/two-factor']){
  expect((await page.request.post(endpoint,{headers:{Origin:'https://foreign.example'},data:{action:'disable',code:otp(secret)}})).status()).toBe(403);
 }
 await page.getByRole('button',{name:'Turn off 2FA',exact:true}).click();
 await page.getByLabel('Authenticator or recovery code',{exact:true}).fill('invalid');
 await page.getByRole('button',{name:'Confirm turn off 2FA'}).click();
 await expect(page.getByRole('status')).toContainText('valid authenticator or recovery code');
 await page.getByRole('button',{name:'Keep 2FA on'}).click();
 await page.getByRole('button',{name:'Turn off 2FA',exact:true}).click();
 await page.getByLabel('Authenticator or recovery code',{exact:true}).fill(otp(secret));
 await page.screenshot({path:`hub-results/optional-2fa-${info.project.name}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Confirm turn off 2FA'}).click();
 await expect(page.getByLabel('Team username')).toBeVisible();
 expect((await page.request.get('/api/admin/menu')).status()).toBe(401);
 await login();await security();
 await expect(page.getByText(/optional and currently off/)).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
});
