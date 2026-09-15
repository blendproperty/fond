import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('named super admin sees a locally rendered authenticator QR and manual fallback', async ({ request, page }) => {
  const bootstrap = await request.post('/api/admin/login', { data: { code: process.env.FOND_ADMIN_CODE } });
  expect(bootstrap.ok()).toBe(true);
  const cookie = bootstrap.headers()['set-cookie'].split(';')[0];
  const username = `qr.${randomUUID().slice(0, 8)}`;
  const created = await request.post('/api/admin/manage/team', { headers: { Cookie: cookie }, data: { name: 'QR test', username, role: 'super-admin', active: true, password: 'fixture-password-1234' } });
  expect(created.ok()).toBe(true);
  const login = await request.post('/api/admin/login', { data: { username, password: 'fixture-password-1234' } });
  expect(login.ok()).toBe(true);
  const namedCookie = login.headers()['set-cookie'].split(';')[0];
  await page.context().addCookies([{ name: namedCookie.split('=')[0], value: namedCookie.split('=').slice(1).join('='), domain: '127.0.0.1', path: '/' }]);
  const secret = 'JBSWY3DPEHPK3PXP';
  await page.route('**/api/admin/two-factor', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { active: false } });
    return route.fulfill({ json: { secret, uri: `otpauth://totp/FOND%3A${username}?secret=${secret}&issuer=FOND&digits=6&period=30` } });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Set up authenticator' }).click();
  const qr = page.getByRole('img', { name: 'Authenticator setup QR code' });
  await expect(qr).toBeVisible();
  await expect.poll(() => qr.evaluate((element: HTMLCanvasElement) => {
    const pixels = element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data;
    return pixels.some((value, index) => index % 4 === 0 && value < 50);
  })).toBe(true);
  await expect(page.getByRole('button', { name: 'Verify and enable 2FA' })).toBeDisabled();
  await page.getByText('Using the same phone? Enter a setup key instead').click();
  await expect(page.getByLabel('Manual setup key')).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show key' }).click();
  await expect(page.getByLabel('Manual setup key')).toHaveValue(secret);
  await page.getByLabel('Six digit code').fill('123456');
  await expect(page.getByRole('button', { name: 'Verify and enable 2FA' })).toBeEnabled();
});
