import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('customer can sign up, place an order, then see it in their own account', async ({ page }) => {
  const email = `${randomUUID()}@example.test`;
  await page.goto('/account');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('account-password-123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to menu' }).click();
  await page.getByRole('button', { name: 'Add Smashed Avo', exact: true }).click();
  await page.getByRole('button', { name: /Basket/ }).first().click();
  await page.getByLabel(/Your name/).fill('Account browser test');
  await page.getByLabel('Contact number').fill('0821234567');
  await page.getByRole('button', { name: 'Send order to FOND' }).click();
  await expect(page.getByText('Order sent to FOND.')).toBeVisible();
  await page.goto('/account');
  await expect(page.getByText('Account browser test')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /^FOND-/ })).toBeVisible();
  await expect(page.getByText('Smashed Avo')).toBeVisible();
});
