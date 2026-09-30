import {test,expect} from '@playwright/test';
import sharp from 'sharp';

test('Gym and Padel event image upload, privacy, publishing, replacement and removal',async({page,request,playwright,baseURL},info)=>{
  const suffix=`${Date.now()}-${info.project.name}`;
  const owner=await request.post('/api/admin/login',{data:{code:'isolated-hub-admin'}});
  const ownerCookie=owner.headers()['set-cookie'].split(';')[0];
  for(const role of ['gym','padel'])expect((await request.post('/api/admin/manage/team',{headers:{Cookie:ownerCookie},data:{name:`Image ${role}`,username:`image-${role}-${suffix}`,role,active:true,password:'isolated-test-password'}})).ok()).toBe(true);
  const anonymous=await playwright.request.newContext({baseURL});
  try{
    expect((await anonymous.post('/api/hub/event-images?service=gym')).status()).toBe(401);
    for(const service of ['gym','padel'] as const){
      await page.goto('/hub/manage');await page.getByLabel('Team username').fill(`image-${service}-${suffix}`);await page.getByLabel('Password',{exact:true}).fill('isolated-test-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Signup & interest requests'})).toBeVisible();
      const cookie=(await page.context().cookies()).map(c=>c.name+'='+c.value).join('; ');
      const title=`Image fixture ${service} ${suffix}`;
      await page.getByRole('combobox',{name:'Calendar',exact:true}).selectOption(`${service}-events`);
      await page.getByLabel('Title',{exact:true}).fill(title);await page.getByLabel('Description',{exact:true}).fill('Local image workflow fixture');
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      await page.getByLabel('Starts (South African time)').fill(`${today}T22:00`);await page.getByLabel('Ends (South African time)').fill(`${today}T23:59`);await page.getByLabel('Location',{exact:true}).fill('Fixture venue');
      const buffer=await sharp({create:{width:900,height:1200,channels:3,background:service==='gym'?'#b6d68e':'#b0c5f5'}}).png().toBuffer();
      await page.getByLabel('Event image',{exact:false}).setInputFiles({name:'fixture.png',mimeType:'image/png',buffer});
      await expect(page.getByText('Image ready. Save the event to apply it.')).toBeVisible();
      const url=await page.getByRole('img',{name:'Event image preview',exact:true}).getAttribute('src');expect(url).toBeTruthy();
      await page.getByLabel('Image description',{exact:true}).fill(`${service} fixture poster`);
      expect((await anonymous.get(url!)).status()).toBe(404);
      expect((await page.request.post(`/api/hub/event-images?service=${service==='gym'?'padel':'gym'}`,{headers:{Cookie:cookie}})).status()).toBe(403);
      expect((await page.request.post(`/api/hub/event-images?service=${service}`,{headers:{Cookie:cookie,Origin:'https://untrusted.example'}})).status()).toBe(403);
      await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText('Saved.',{exact:true})).toBeVisible();
      const row=page.locator('article').filter({has:page.getByRole('heading',{name:title,exact:true})});await row.getByRole('button',{name:'Edit entry'}).click();
      await expect(page.getByLabel('Image description',{exact:true})).toHaveValue(`${service} fixture poster`);
      await page.screenshot({path:`hub-results/event-editor-${service}-${info.project.name}.png`,fullPage:true});
      await page.getByLabel('Publish on the customer calendar').check();await page.getByRole('button',{name:'Save & publish',exact:true}).click();await expect(page.getByText('Saved.',{exact:true})).toBeVisible();
      expect((await anonymous.get(url!)).status()).toBe(200);
      const events=(await(await page.request.get(`/api/hub/manage?service=${service}`,{headers:{Cookie:cookie}})).json()).events;const id=events.find((e:any)=>e.title===title).id;
      await page.goto(`/${service}/events`);await expect(page.getByRole('img',{name:`${service} fixture poster`,exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.goto(`/${service}/interest/${id}`);await expect(page.getByRole('img',{name:`${service} fixture poster`,exact:true})).toBeVisible();
      await page.screenshot({path:`hub-results/event-image-${service}-${info.project.name}.png`,fullPage:true});
      await page.goto(`/hub/manage?service=${service}`);await row.getByRole('button',{name:'Edit entry'}).click();
      await page.getByLabel('Event image',{exact:false}).setInputFiles({name:'replacement.png',mimeType:'image/png',buffer});await expect(page.getByText('Image ready. Save the event to apply it.')).toBeVisible();
      const replacement=await page.locator('.hub-event-upload img').getAttribute('src');expect(replacement).not.toBe(url);
      await page.getByRole('button',{name:'Save & publish',exact:true}).click();await expect(page.getByText('Saved.',{exact:true})).toBeVisible();expect((await anonymous.get(url!)).status()).toBe(404);
      await row.getByRole('button',{name:'Edit entry'}).click();await page.getByRole('button',{name:'Remove image',exact:true}).click();await page.getByRole('button',{name:'Save & publish',exact:true}).click();await expect(page.getByText('Saved.',{exact:true})).toBeVisible();expect((await anonymous.get(replacement!)).status()).toBe(404);
      await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByLabel('Team username')).toBeVisible();
    }
  }finally{await anonymous.dispose();}
});
