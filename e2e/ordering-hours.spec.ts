import {test,expect} from '@playwright/test';
for(const scenario of [
  {name:'before opening',date:'2026-10-01T06:00:00+02:00',open:false,label:'Opens today at 07:00'},
  {name:'during service',date:'2026-10-01T09:00:00+02:00',open:true,label:'Open until 18:30'},
  {name:'Saturday closing',date:'2026-10-03T12:00:00+02:00',open:false,label:'Opens Monday at 07:00'},
  {name:'Sunday',date:'2026-10-04T10:00:00+02:00',open:false,label:'Opens tomorrow at 07:00'},
  {name:'manual pause',date:'2026-10-01T06:00:00+02:00',open:false,label:'Ordering paused — contact FOND',paused:true},
])test(`opening time and hours are visible ${scenario.name}`,async({page},info)=>{
  await page.clock.setFixedTime(new Date(scenario.date));
  await page.route('**/api/store',async route=>{const response=await route.fetch(),body=await response.json();body.open=scenario.open;Object.assign(body.settings,{orderingEnabled:!scenario.paused,enforceHours:true,openingTime:'07:00',closingTime:'18:30',saturdayClosingTime:'12:00',openDays:[1,2,3,4,5,6],foodTruckOpeningTime:'07:00',foodTruckClosingTime:'15:30',foodTruckOpenDays:[1,2,3,4,5]});await route.fulfill({response,json:body});});
  await page.goto('/');
  await expect(page.locator('.fond-service-status')).toContainText(scenario.label);
  const schedule=page.getByLabel('Trading hours');await expect(schedule).toContainText('Mon–Fri 07:00–18:30 · Sat 07:00–12:00 · Sun closed');await expect(schedule).toContainText('Mon–Fri 07:00–15:30 · Sat–Sun closed');
  await expect(schedule).toContainText('South African time');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(scenario.name==='before opening')await page.screenshot({path:info.outputPath('opening-hours.png')});
});
