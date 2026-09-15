import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('staff accepts, records Yoco entry, then marks the order ready', async ({ page, request }) => {
  const created = await request.post('/api/orders', { headers: { 'Idempotency-Key': randomUUID() }, data: { customerName: 'POS browser test', collectionTime: 'ASAP', lines: [{ id: 'espresso-single', quantity: 1 }] } });
  expect(created.status()).toBe(201);
  const { reference } = await created.json();
  await page.goto('/staff');
  await page.getByLabel('Staff access code').fill(process.env.FOND_STAFF_CODE!);
  await page.getByRole('button', { name: 'Open order queue' }).click();
  const card = page.locator('.staff-card').filter({ hasText: reference });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Accept' }).click();
  await expect(card.getByRole('button', { name: 'Mark ready' })).toHaveCount(0);
  await card.getByRole('button', { name: 'Record Yoco entry' }).click();
  await card.getByLabel('Yoco order reference').fill('YOCO-BROWSER-1');
  await card.getByRole('button', { name: 'Confirm Yoco entry' }).click();
  await expect(card.getByText('Entered in Yoco · YOCO-BROWSER-1')).toBeVisible();
  await card.getByRole('button', { name: 'Mark ready' }).click();
  await expect(card).toBeVisible();
});
