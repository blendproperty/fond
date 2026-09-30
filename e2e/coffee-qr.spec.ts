import {test,expect} from '@playwright/test';
import {createRequire} from 'node:module';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
const require=createRequire(process.cwd()+'/package.json'),{PNG}=require('pngjs');
const code='COFFEE-11223344556677889900';
test('customer QR decodes to their exact reward and staff camera validates it automatically',async({page},info)=>{
 await page.route('**/api/auth/session',r=>r.fulfill({json:{user:{id:'example',email:'qr@example.test',emailVerified:true}}}));
 await page.route('**/api/account/rewards',r=>r.fulfill({json:{verified:true,environment:'test',stamps:0,stampsToNext:10,rewards:[{id:'reward',code,kind:'earned',status:'available'}],preferences:{}}}));
 await page.goto('/rewards');await page.getByRole('button',{name:'Show code to staff'}).click();
 const image=page.getByAltText('Free coffee redemption QR code');await expect(image).toBeVisible();
 const dataUrl=(await image.getAttribute('src'))!;const pixels=PNG.sync.read(Buffer.from(dataUrl.split(',')[1],'base64'));
 expect(jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height)?.data).toBe(code);
 await page.getByRole('dialog').screenshot({path:info.outputPath('free-coffee-qr.png')});
 await page.addInitScript(({dataUrl})=>{
  (window as any).BarcodeDetector=undefined;
  let stops=0;Object.defineProperty(window,'rewardCameraStops',{get:()=>stops});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const img=new Image();img.src=dataUrl;await img.decode();const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.getContext('2d')!.drawImage(img,0,0,400,400);
   const stream=canvas.captureStream(10);for(const track of stream.getTracks()){const original=track.stop.bind(track);track.stop=()=>{stops++;original();};}return stream;
  }});
 },{dataUrl});
 await page.goto('/staff');await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE!);await page.getByRole('button',{name:'Open order queue'}).click();
 await page.getByRole('button',{name:'Redeem coffee',exact:true}).click();const drawer=page.getByRole('dialog',{name:'Add order manually'});
 let submitted='';
 await page.route('**/api/staff/rewards',r=>{submitted=r.request().postDataJSON().code;return r.fulfill({json:{discountCents:3200,totalCents:0,environment:'test'}});});
 await drawer.getByRole('button',{name:'Scan coffee reward',exact:true}).click();
 await expect(drawer.getByLabel('Coffee reward code')).toHaveValue(code);expect(submitted).toBe('');await drawer.getByRole('button',{name:'Add Espresso (Single)',exact:true}).click();await expect(drawer.getByText('TEST code verified.',{exact:false})).toBeVisible();expect(submitted).toBe(code);
 await expect.poll(()=>page.evaluate(()=>(window as any).rewardCameraStops)).toBe(1);
 await expect(drawer.getByLabel('Coffee reward camera')).toHaveCount(0);
 await drawer.screenshot({path:info.outputPath('staff-scanned-reward.png')});
});
test('membership QR is rejected and closing the drawer stops camera access',async({page})=>{
 const dataUrl=await QRCode.toDataURL('FOND-M-AABBCCDDEEFF',{width:300,margin:4});
 await page.addInitScript(({dataUrl})=>{
  let stopped=false;Object.defineProperty(window,'rewardCameraStopped',{get:()=>stopped});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const image=new Image();image.src=dataUrl;await image.decode();const canvas=document.createElement('canvas');canvas.width=400;canvas.height=400;canvas.getContext('2d')!.drawImage(image,0,0,400,400);
   const stream=canvas.captureStream(10);const track=stream.getTracks()[0],stop=track.stop.bind(track);track.stop=()=>{stopped=true;stop();};return stream;
  }});
 },{dataUrl});
 await page.goto('/staff');await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE!);await page.getByRole('button',{name:'Open order queue'}).click();await page.getByRole('button',{name:'Redeem coffee',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Add order manually'});await drawer.getByRole('button',{name:'Scan coffee reward',exact:true}).click();await expect(drawer.getByText('This is not a free-coffee QR.',{exact:false})).toBeVisible();await expect(drawer.getByLabel('Coffee reward code')).toBeEmpty();await drawer.getByRole('button',{name:'Close',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as any).rewardCameraStopped)).toBe(true);
});

test('camera permission denial explains recovery and keeps code entry available',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{throw new DOMException('denied','NotAllowedError');}});});
 await page.goto('/staff');await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE!);await page.getByRole('button',{name:'Open order queue'}).click();await page.getByRole('button',{name:'Redeem coffee',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'Add order manually'});await drawer.getByRole('button',{name:'Scan coffee reward',exact:true}).click();await expect(drawer.getByText('Camera access was blocked.',{exact:false})).toBeVisible();await expect(drawer.getByLabel('Coffee reward camera')).toHaveCount(0);await expect(drawer.getByLabel('Coffee reward code')).toBeEnabled();
});
