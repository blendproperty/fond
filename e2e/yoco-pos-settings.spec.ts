import {test,expect} from '@playwright/test';

test('POS matching setup is super-admin only and remains off until account verification',async({page,request},testInfo)=>{
  expect((await request.get('/api/admin/yoco/pos')).status()).toBe(403);
  expect((await request.post('/api/admin/yoco/pos',{data:{action:'save',config:{enabled:true,environment:'live',locationId:'',eftMappingVerified:true}}})).status()).toBe(403);
  await page.goto('/admin');await page.getByLabel('Admin access code').fill(process.env.FOND_ADMIN_CODE!);await page.getByRole('button',{name:'Unlock',exact:true}).click();
  expect((await page.request.post('/api/admin/yoco/pos',{headers:{Origin:'https://untrusted.example'},data:{action:'check'}})).status()).toBe(403);
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const setup=page.locator('.provider-test').filter({has:page.getByRole('heading',{name:'Yoco POS reference matching'})});
  await expect(setup).toBeVisible();
  await expect(setup.getByLabel('Automatically match prepaid POS references')).not.toBeChecked();
  await expect(setup.getByRole('button',{name:'Check Yoco order access'})).toBeDisabled();
  await expect(setup.getByLabel(/Yoco business API key/)).toHaveAttribute('type','password');
  await setup.getByLabel('Automatically match prepaid POS references').check();
  await setup.getByRole('button',{name:'Save POS matching settings'}).click();
  await expect(setup.getByRole('status')).toContainText('Verify a known EFT-closed POS order');
  await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();
  await expect(setup.getByLabel('Automatically match prepaid POS references')).not.toBeChecked();
  await setup.scrollIntoViewIfNeeded();
  await page.screenshot({path:testInfo.outputPath('yoco-pos-settings.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
