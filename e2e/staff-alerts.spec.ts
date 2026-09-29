import {test, expect, type Page} from '@playwright/test';

declare global {
  interface Window {
    __alerts: {starts:number; peaks:number[]; notices:number; failNotification:boolean; suspend:()=>void};
  }
}

async function tablet(page: Page, permission: NotificationPermission = 'granted') {
  await page.addInitScript(({permission}) => {
    const probe = window.__alerts = {starts:0, peaks:[] as number[], notices:0, failNotification:false, suspend:()=>{}};
    let interacted = false;
    document.addEventListener('click', () => {interacted=true;}, true);
    document.addEventListener('keydown', () => {interacted=true;}, true);
    class AudioMock {
      state = 'suspended'; currentTime = 0; destination = {}; onstatechange: (()=>void) | null = null;
      constructor() { probe.suspend = () => {interacted=false;this.state='suspended';this.onstatechange?.();}; }
      resume() { if(interacted){this.state='running';this.onstatechange?.();} return Promise.resolve(); }
      suspend() { this.state='suspended';this.onstatechange?.();return Promise.resolve(); }
      close() { this.state='closed';return Promise.resolve(); }
      createOscillator() {return {type:'',frequency:{value:0},connect:()=>({connect:()=>{}}),disconnect:()=>{},start:()=>{probe.starts++;},stop:()=>{},onended:null};}
      createGain() {return {gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:(value:number)=>{probe.peaks.push(value);}},disconnect:()=>{}};}
    }
    Object.defineProperty(window,'AudioContext',{value:AudioMock});
    class NotificationMock {static permission=permission;static requestPermission(){return Promise.resolve(permission);} constructor(){throw new Error('Mobile constructor unsupported');}}
    Object.defineProperty(window,'Notification',{value:NotificationMock});
    Object.defineProperty(navigator.serviceWorker,'getRegistration',{value:async()=>({active:{},showNotification:async()=>{probe.notices++;if(probe.failNotification)throw new Error('OS failure');}})});
  }, {permission});
  await page.route('**/api/staff/orders', route=>route.fulfill({json:{orders:[]}}));
  await page.route('**/api/store',route=>route.fulfill({json:{paymentMode:'sandbox',settings:{}}}));
  await page.goto('/staff');
  await expect(page.getByRole('button',{name:'Find order'})).toBeVisible();
}

test('tablet defaults on, restores granted notifications and reports blocked audio honestly after reload', async ({page}) => {
  await tablet(page);
  await expect(page.getByRole('switch',{name:'Order notifications'})).toBeVisible();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('Tap to enable',{exact:true})).toBeVisible();
  await page.getByRole('switch',{name:'Order sound'}).click();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('On',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.__alerts.starts)).toBe(6);
  expect(await page.evaluate(()=>Math.max(...window.__alerts.peaks))).toBe(0.65);
  await page.reload();
  await expect(page.getByRole('switch',{name:'Order notifications'})).toBeVisible();
  await expect(page.getByRole('switch',{name:'Order sound',exact:true})).toBeVisible();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('Tap to enable',{exact:true})).toBeVisible();
  // Any ordinary touch on the board can recover sound without another settings change.
  await page.getByRole('button',{name:'Find order'}).click();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('On',{exact:true})).toBeVisible();
  await page.evaluate(()=>window.__alerts.suspend());
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('Tap to enable',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close order search'}).click();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('On',{exact:true})).toBeVisible();
});

test('intentional mute persists and the sound test re-enables it', async ({page}) => {
  await tablet(page);
  await page.getByRole('switch',{name:'Order sound'}).click();
  await expect(page.getByRole('switch',{name:'Order sound'})).toBeChecked();
  await page.getByRole('switch',{name:'Order sound',exact:true}).click();
  await page.reload();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('Off',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Find order'}).click();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('Off',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close order search'}).click();
  await page.getByRole('switch',{name:'Order sound'}).click();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('On',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('fond.staff.sound'))).toBe('on');
});

test('Android notification failures do not stop queue updates; waiting orders repeat and acceptance stops reminders', async ({page}) => {
  await page.clock.install();
  await tablet(page);
  await page.getByRole('switch',{name:'Order sound'}).click();
  await page.clock.fastForward(3000);
  await page.evaluate(()=>{window.__alerts.failNotification=true;});
  let status='received';
  const order={id:'tablet-alert-1',reference:'test-ref',displayReference:'CAFE-123',customerName:'Alert fixture',lines:[],collectionTime:'ASAP',totalCents:1000,source:'customer',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),fulfillment:'collection',posRequired:true,posRecordedAt:null,estimatedPrepMinutes:10,basketPrepMinutes:10,paymentMethod:'pay_at_collection',paymentRequired:false};
  await page.route('**/api/staff/orders', route=>route.fulfill({json:{orders:[{...order,status}]}}));
  await page.clock.fastForward(5000);
  await expect(page.locator('.staff-card').filter({hasText:'CAFE-123'})).toBeVisible();
  await expect(page.getByText(/A tablet notification could not be shown/)).toBeVisible();
  expect(await page.evaluate(()=>window.__alerts.notices)).toBe(1);
  expect(await page.evaluate(()=>window.__alerts.starts)).toBe(12);
  await page.clock.fastForward(30000);
  await expect.poll(()=>page.evaluate(()=>window.__alerts.starts)).toBe(18);
  expect(await page.evaluate(()=>window.__alerts.notices)).toBe(1);
  status='accepted';
  await page.clock.fastForward(5000);
  await expect(page.getByRole('button',{name:'Record Yoco entry',exact:true})).toBeVisible();
  await page.clock.fastForward(30000);
  expect(await page.evaluate(()=>window.__alerts.starts)).toBe(18);
});

test('denied notification permission stays visible without disabling sound', async ({page}) => {
  await tablet(page,'denied');
  await expect(page.getByRole('switch',{name:'Order notifications'})).toBeDisabled();
  await page.getByRole('switch',{name:'Order sound'}).click();
  await expect(page.getByRole('switch',{name:'Order sound'}).getByText('On',{exact:true})).toBeVisible();
  await expect(page.getByText('Notifications are blocked. Allow them in the tablet’s app or browser settings.')).toBeVisible();
});


test('notification switch persists independently from sound and suppresses new alerts',async({page})=>{
 await page.clock.install();await tablet(page);
 const notifications=page.getByRole('switch',{name:'Order notifications'}),sound=page.getByRole('switch',{name:'Order sound'});
 await expect(notifications).toBeChecked();await sound.click();await expect(sound).toBeChecked();await sound.click();await notifications.click();
 await expect(notifications).not.toBeChecked();await page.reload();await expect(notifications).not.toBeChecked();await expect(sound).not.toBeChecked();
 const order={id:'silent-one',reference:'silent',displayReference:'SILENT-1',customerName:'Silent fixture',lines:[],collectionTime:'ASAP',totalCents:1000,source:'customer',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),fulfillment:'collection',posRequired:true,posRecordedAt:null,estimatedPrepMinutes:10,basketPrepMinutes:10,paymentMethod:'pay_at_collection',paymentRequired:false,status:'received'};
 await page.route('**/api/staff/orders',r=>r.fulfill({json:{orders:[order]}}));await page.clock.fastForward(5000);await expect(page.locator('.staff-card')).toContainText('SILENT-1');expect(await page.evaluate(()=>window.__alerts.notices)).toBe(0);
 await notifications.click();await expect(notifications).toBeChecked();await expect(sound).not.toBeChecked();
 await page.route('**/api/staff/orders',r=>r.fulfill({json:{orders:[order,{...order,id:'notice-two',displayReference:'NOTICE-2'}]}}));await page.clock.fastForward(5000);await expect.poll(()=>page.evaluate(()=>window.__alerts.notices)).toBe(1);expect(await page.evaluate(()=>window.__alerts.starts)).toBe(0);
});

test('tablet toolbar keeps settings and actions readable at tablet and phone widths',async({page},info)=>{
 await tablet(page);
 for(const width of [1886,1280,1100,1024,960,768,390,320]){
  await page.setViewportSize({width,height:800});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const button of await page.locator('.staff-header-actions>button,.staff-coffee-actions>button').all()){
   const box=await button.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(48);expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
  }
  const header=await page.locator('.staff-header').boundingBox(),actions=await page.locator('.staff-header-actions').boundingBox();expect(actions!.y).toBeGreaterThanOrEqual(header!.y+header!.height-1);
  const logo=await page.locator('.staff-header-logo').boundingBox();expect(Math.abs(logo!.x+logo!.width/2-width/2)).toBeLessThan(1);expect(logo!.width).toBeGreaterThanOrEqual(width===960?240:280);
  const badge=await page.locator('.staff-payment-mode').boundingBox();
  await expect(page.locator('.staff-header .staff-payment-mode')).toHaveCount(0);
  if(width>=960){
   const identity=await page.locator('.staff-header-identity').boundingBox(),settings=await page.locator('.staff-device-controls').boundingBox();
   expect(identity!.x+identity!.width).toBeLessThanOrEqual(logo!.x);
   expect(logo!.x+logo!.width).toBeLessThanOrEqual(settings!.x);
   for(const box of [identity!,settings!])expect(Math.abs(box.y+box.height/2-(logo!.y+logo!.height/2))).toBeLessThan(1);
   expect(header!.height).toBeLessThanOrEqual(120);
   const find=await page.locator('.staff-find-button').boundingBox(),earn=await page.locator('.staff-earn-coffee').boundingBox();
   expect(badge!.x).toBeGreaterThanOrEqual(find!.x+find!.width);
   expect(badge!.x+badge!.width).toBeLessThanOrEqual(earn!.x);
   expect(Math.abs(badge!.y+badge!.height/2-(find!.y+find!.height/2))).toBeLessThan(1);
  }
  if(width===1886||width===1280||width===1024||width===390)await page.screenshot({path:info.outputPath(`staff-toolbar-${width}.png`)});
 }
});


test('one sound switch handles keyboard activation, mute and suspended audio without a duplicate action',async({page})=>{
 await tablet(page);const sound=page.getByRole('switch',{name:'Order sound'});
 await expect(sound).toHaveCount(1);await expect(sound).not.toBeChecked();
 await expect(page.getByRole('button',{name:/^(Enable|Test|Mute) sound$/})).toHaveCount(0);await expect(page.locator('.staff-alert-status')).toHaveCount(0);
 await sound.press('Space');await expect(sound).toBeChecked();expect(await page.evaluate(()=>window.__alerts.starts)).toBe(6);
 await sound.press('Enter');await expect(sound).not.toBeChecked();await expect(sound).toContainText('Off');
 await sound.press('Space');await expect(sound).toBeChecked();
 await page.evaluate(()=>window.__alerts.suspend());await expect(sound).not.toBeChecked();await expect(sound).toContainText('Tap to enable');
 await sound.press('Space');await expect(sound).toBeChecked();await expect(page.locator('.staff-alert-status')).toHaveCount(0);
});
