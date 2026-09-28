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
  await page.goto('/staff');
  await expect(page.getByRole('button',{name:'Find order'})).toBeVisible();
}

test('tablet defaults on, restores granted notifications and reports blocked audio honestly after reload', async ({page}) => {
  await tablet(page);
  await expect(page.getByRole('button',{name:'Notifications on'})).toBeVisible();
  await expect(page.getByText('Sound needs a tap · tap Enable sound',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^(Enable|Test) sound$/}).click();
  await expect(page.getByText('Sound on · loud',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.__alerts.starts)).toBe(6);
  expect(await page.evaluate(()=>Math.max(...window.__alerts.peaks))).toBe(0.65);
  await page.reload();
  await expect(page.getByRole('button',{name:'Notifications on'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Mute sound',exact:true})).toBeVisible();
  await expect(page.getByText('Sound needs a tap · tap Enable sound',{exact:true})).toBeVisible();
  // Any ordinary touch on the board can recover sound without another settings change.
  await page.getByRole('button',{name:'Find order'}).click();
  await expect(page.getByText('Sound on · loud',{exact:true})).toBeVisible();
  await page.evaluate(()=>window.__alerts.suspend());
  await expect(page.getByText('Sound needs a tap · tap Enable sound',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close order search'}).click();
  await expect(page.getByText('Sound on · loud',{exact:true})).toBeVisible();
});

test('intentional mute persists and the sound test re-enables it', async ({page}) => {
  await tablet(page);
  await page.getByRole('button',{name:'Mute sound',exact:true}).click();
  await page.reload();
  await expect(page.getByText('Sound muted',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Find order'}).click();
  await expect(page.getByText('Sound muted',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Close order search'}).click();
  await page.getByRole('button',{name:/^(Enable|Test) sound$/}).click();
  await expect(page.getByText('Sound on · loud',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('fond.staff.sound'))).toBe('on');
});

test('Android notification failures do not stop queue updates; waiting orders repeat and acceptance stops reminders', async ({page}) => {
  await page.clock.install();
  await tablet(page);
  await page.getByRole('button',{name:/^(Enable|Test) sound$/}).click();
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
  await expect(page.getByRole('button',{name:'Notifications blocked'})).toBeVisible();
  await page.getByRole('button',{name:'Notifications blocked'}).click();
  await expect(page.getByText('Sound on · loud',{exact:true})).toBeVisible();
  await expect(page.getByText('Notifications are blocked. Allow them in the tablet’s app or browser settings.')).toBeVisible();
});
