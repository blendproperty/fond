import {test,expect} from '@playwright/test';
const user={id:'security-preview',email:'customer@example.test',emailVerified:true};
const token='a'.repeat(64);
const off={enabled:false,channel:null,destination:null,emailAvailable:true,smsAvailable:true};

test('forgot password supports code, confirmation, errors and returning to sign in',async({page},info)=>{
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:null}}));
 await page.route('**/api/auth/password-reset',r=>r.fulfill({json:r.request().method()==='POST'?{challenge:token,message:'If an account exists for that email, a password reset code is on its way.'}:{message:'Password updated. Sign in with your new password. Your two-factor setting is unchanged.'}}));
 await page.goto('/account');await page.getByRole('button',{name:'Forgot password?'}).click();
 await expect(page.getByRole('heading',{name:'Reset your password'})).toBeVisible();
 await page.getByLabel('Email',{exact:true}).fill('customer@example.test');await page.getByRole('button',{name:'Send reset code'}).click();
 await page.getByLabel('Password reset code').fill('123456');await page.getByLabel('New password',{exact:true}).fill('new-password');await page.getByLabel('Confirm new password').fill('mismatch-password');
 await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('do not match');
 await page.getByLabel('Confirm new password').fill('new-password');await page.screenshot({path:info.outputPath('password-reset.png'),fullPage:true});
 await page.getByRole('button',{name:'Save new password'}).click();await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();await expect(page.getByRole('status')).toContainText('two-factor setting is unchanged');
 await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('sign-in remains pending until two-factor code succeeds and does not resubmit password',async({page},info)=>{
 let logged=false;
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:logged?user:null}}));await page.route('**/api/account/orders',r=>r.fulfill({json:{orders:[]}}));await page.route('**/api/account/security',r=>r.fulfill({json:{...off,enabled:true,channel:'email',destination:'c•••@example.test'}}));
 await page.route('**/api/auth/login',r=>{
  const body=r.request().postDataJSON();
  if(r.request().method()==='POST')return r.fulfill({json:{twoFactorRequired:true,challenge:token,channel:'email',destination:'c•••@example.test'}});
  expect(body.password).toBeUndefined();
  if(body.code!=='123456')return r.fulfill({status:400,json:{message:'Incorrect code. Please try again.'}});
  logged=true;return r.fulfill({json:{user}});
 });
 await page.goto('/account');await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByLabel('Password',{exact:true}).fill('customer-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Check your sign-in code'})).toBeVisible();expect(logged).toBe(false);
 await page.getByLabel('Sign-in or recovery code').fill('000000');await page.getByRole('button',{name:'Verify and sign in'}).click();await expect(page.getByRole('main').getByRole('alert')).toContainText('Incorrect code');
 await page.screenshot({path:info.outputPath('sign-in-code.png'),fullPage:true});await page.getByLabel('Sign-in or recovery code').fill('123456');await page.getByRole('button',{name:'Verify and sign in'}).click();
 await expect(page.getByText('Signed in as '+user.email)).toBeVisible();
});

test('account settings verify SMS enrollment, show recovery codes and require confirmation to disable',async({page},info)=>{
 let enabled=false;
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user}}));await page.route('**/api/account/orders',r=>r.fulfill({json:{orders:[]}}));
 await page.route('**/api/account/security',r=>{
  if(r.request().method()==='GET')return r.fulfill({json:off});
  const b=r.request().postDataJSON();
  if(r.request().method()==='POST'){expect(b.password).toBe('customer-password');if(b.action==='enable'){expect(b.channel).toBe('sms');expect(b.phone).toBe('0821234567');}return r.fulfill({json:{challenge:token,channel:'sms',destination:'•••• 4567'}});}
  expect(b.code).toBe('123456');enabled=b.action==='enable';return r.fulfill({json:{security:{...off,enabled,channel:enabled?'sms':null,destination:enabled?'•••• 4567':null},recoveryCodes:enabled?['AABBCCDDEEFF0011','1122334455667788']:[]}});
 });
 await page.goto('/account');await page.locator('#account-security summary').click();const security=page.locator('#account-security');
 await security.getByRole('radio',{name:'SMS',exact:true}).check();await security.getByLabel('Mobile number').fill('0821234567');await security.getByLabel('Current password').fill('customer-password');await security.getByRole('button',{name:'Send setup code'}).click();
 expect(enabled).toBe(false);await expect(security.getByLabel('Setup code')).toBeVisible();await security.getByLabel('Setup code').fill('123456');await security.getByRole('button',{name:'Verify and enable'}).click();expect(enabled).toBe(true);
 await expect(security.getByRole('heading',{name:'Save your recovery codes'})).toBeVisible();await security.getByRole('button',{name:'I’ve saved my recovery codes'}).click();
 await page.screenshot({path:info.outputPath('account-security-sms.png'),fullPage:true});
 await security.getByLabel('Current password').fill('customer-password');await security.getByRole('button',{name:'Turn off two-factor sign-in',exact:true}).click();expect(enabled).toBe(true);
 await security.getByLabel('Security or recovery code').fill('123456');await security.getByRole('button',{name:'Confirm turn off'}).click();expect(enabled).toBe(false);await expect(security.getByRole('status')).toContainText('is off');
 await page.setViewportSize({width:320,height:740});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('security endpoints reject anonymous and cross-origin mutations without sending messages',async({request})=>{
 expect((await request.get('/api/account/security')).status()).toBe(401);
 for(const url of ['/api/auth/login','/api/auth/password-reset']){
  expect((await request.post(url,{headers:{origin:'https://other.example'},data:{email:'example@example.test',password:'password'}})).status()).toBe(403);
  expect((await request.patch(url,{headers:{origin:'https://other.example'},data:{challenge:token,code:'123456',password:'password'}})).status()).toBe(403);
 }
 expect((await request.patch('/api/auth/login',{data:{challenge:token,code:'123456'}})).status()).toBe(400);
});
