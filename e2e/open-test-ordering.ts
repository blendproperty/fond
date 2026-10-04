import {expect,type APIRequestContext} from '@playwright/test';

// Isolated local test server only: order tests must not depend on the day/hour.
export async function openTestOrdering(request:APIRequestContext){
 const login=await request.post('/api/admin/login',{data:{code:process.env.FOND_ADMIN_CODE}});
 expect(login.ok()).toBe(true);
 const headers={Cookie:login.headers()['set-cookie'].split(';')[0]};
 const current=await request.get('/api/admin/manage/settings',{headers});
 expect(current.ok()).toBe(true);
 const settings=(await current.json()).settings;
 const saved=await request.post('/api/admin/manage/settings',{headers,data:{...settings,orderingEnabled:true,enforceHours:false,openDays:[0,1,2,3,4,5,6],openingTime:'00:00',closingTime:'23:59',saturdayClosingTime:'23:59'}});
 expect(saved.ok()).toBe(true);
}
