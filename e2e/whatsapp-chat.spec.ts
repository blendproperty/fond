import {test, expect} from '@playwright/test';

test('WhatsApp chat opens on customer pages, fits the screen and closes with Escape', async ({page}, testInfo) => {
  await page.goto('/hub');
  const trigger = page.getByRole('button', {name:'Chat on WhatsApp'});
  await trigger.click();
  const panel = page.getByRole('dialog', {name:'Let’s chat.'});
  await expect(panel).toBeVisible();
  const link = panel.getByRole('link', {name:'Continue in WhatsApp'});
  const url = new URL((await link.getAttribute('href'))!);
  expect(url.origin + url.pathname).toBe('https://wa.me/27690420108');
  expect(url.searchParams.get('text')).toBe('Hi Midpoint Hub, I would like some help please.');
  await expect(link).toBeFocused();
  const bounds = await panel.boundingBox(), viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  await page.screenshot({path:testInfo.outputPath('whatsapp-chat.png')});
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0); await expect(trigger).toBeFocused();
  await page.goto('/'); await expect(trigger).toBeVisible();
  await page.getByRole('button', {name:'Basket', exact:true}).click();
  await expect(page.getByRole('dialog', {name:'Your basket'})).toBeVisible();
  await page.getByRole('dialog', {name:'Your basket'}).getByRole('button', {name:'Close',exact:true}).click();
  await expect(page.getByRole('dialog', {name:'Your basket'})).toHaveCount(0);
  await page.goto('/admin'); await expect(trigger).toHaveCount(0);
  await page.goto('/staff'); await expect(trigger).toHaveCount(0);
});
