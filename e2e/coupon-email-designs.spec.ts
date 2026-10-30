import {test,expect} from '@playwright/test';
import {buildCouponEmail} from '../src/lib/coupon-email';
const designs=[['Customer appreciation','A little thank you.'],['Frequent customer reward','Good habits.'],['Service recovery','Let’s make your'],['Promotion','Lunch plans?'],['Birthday / special occasion','Make a meal'],['Testing','Good design.'],['Other','A little something']];
test('all seven coupon reasons render branded photography, accurate offers and responsive full email previews without issuance',async({page},info)=>{
 test.setTimeout(60000);
 await page.goto('/admin');await page.getByLabel('Admin access code').fill(process.env.FOND_ADMIN_CODE!);await page.getByRole('button',{name:'Unlock',exact:true}).click();await page.getByRole('button',{name:'Loyalty',exact:true}).click();
 const panel=page.getByRole('region',{name:'Loyalty coupons · testing'}),automation=await panel.getByLabel('Enable loyalty candidate selection').isChecked(),mutations:string[]=[];
 page.on('request',request=>{if(new URL(request.url()).pathname==='/api/admin/coupons'&&request.method()!=='GET')mutations.push(request.method());});
 for(const [i,[reason,heading]] of designs.entries()){
  await panel.getByRole('combobox',{name:'Coupon reason',exact:true}).selectOption(reason);
  if(i===0)await panel.getByText('Preview email design for this reason',{exact:true}).click();const preview=page.getByRole('region',{name:'Draft coupon email design'});await preview.locator('iframe').scrollIntoViewIfNeeded();
  if(info.project.name==='desktop'&&reason==='Testing'){await preview.getByRole('button',{name:'Mobile',exact:true}).click();await expect(preview.locator('.coupon-email-device')).toHaveClass(/mobile/);await preview.getByRole('button',{name:'Desktop',exact:true}).click();}
  const frame=page.frameLocator('iframe[title="Draft coupon email design"]');await expect(frame.getByRole('heading',{level:1})).toContainText(heading);await expect(frame.getByText('COUPON-PREVIEW-ONLY',{exact:true})).toBeVisible();
  await expect.poll(()=>frame.locator('img').evaluateAll(imgs=>imgs.length>=2&&imgs.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  expect(await frame.locator('body').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await expect.poll(()=>preview.locator('iframe').evaluate(el=>el.clientHeight>=((el as HTMLIFrameElement).contentDocument?.body.getBoundingClientRect().height??99999)-2)).toBe(true);
  await frame.locator('body').screenshot({path:info.outputPath(`coupon-email-${i}.png`)});
 }
 const after=await page.evaluate(async()=>await (await fetch('/api/admin/coupons')).json());expect(mutations).toEqual([]);expect(after.delivery).toBe('manual');expect(await panel.getByLabel('Enable loyalty candidate selection').isChecked()).toBe(automation);
 if(info.project.name==='desktop'){
  const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;');
  await page.setViewportSize({width:1320,height:1000});await page.setContent(`<html><head><style>body{margin:0;padding:28px;background:#e5ece7;font-family:Arial,sans-serif}h1{color:#123f35;margin:0 0 8px}p{color:#496157;margin:0 0 24px}.gallery{display:grid;grid-template-columns:repeat(4,300px);gap:20px}.card{background:white;border:1px solid #cbd9d0;border-radius:10px;overflow:hidden}.label{padding:14px;font-size:13px;font-weight:bold;color:#123f35}.frame{width:294px;position:relative}iframe{border:0;width:640px;height:2200px;transform:scale(.46);transform-origin:top left}</style></head><body><h1>FOND / The coupon collection</h1><p>Seven reasons. Seven designs. Preview only — no email delivery.</p><div class="gallery">${designs.map(([reason])=>`<div class="card"><div class="label">${reason}</div><div class="frame"><iframe srcdoc="${escape(buildCouponEmail({reason,code:'COUPON-PREVIEW-ONLY',email:'your.email@example.com',percent:10,amountCents:0,expiresAt:'2026-11-29T07:04:48Z',baseUrl:'http://127.0.0.1:3100'}).html)}"></iframe></div></div>`).join('')}</div></body></html>`);
  await expect.poll(()=>page.locator('iframe').evaluateAll(frames=>frames.every(node=>{const frame=node as HTMLIFrameElement;return frame.contentDocument?.images.length===2&&Array.from(frame.contentDocument.images).every(img=>img.complete&&img.naturalWidth>0);}))).toBe(true);
  await page.locator('iframe').evaluateAll(frames=>{for(const node of frames){const frame=node as HTMLIFrameElement;const h=Math.ceil(frame.contentDocument!.body.getBoundingClientRect().height);frame.style.height=h+'px';(frame.parentElement as HTMLElement).style.height=(h*.46)+'px';}});await page.screenshot({path:info.outputPath('coupon-collection.png'),fullPage:true});
 }
});
