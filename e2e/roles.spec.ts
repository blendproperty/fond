import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('super admin owns provider settings while named admin can manage operations', async ({ request }) => {
  const bootstrap = await request.post('/api/admin/login', { data: { code: process.env.FOND_ADMIN_CODE } });
  expect(bootstrap.ok()).toBe(true);
  const superHeaders = { Cookie: bootstrap.headers()['set-cookie'].split(';')[0] };
  expect((await request.get('/api/admin/provider-credentials', { headers: superHeaders })).status()).toBe(200);
  const username = `manager.${randomUUID().slice(0, 8)}`;
  const created = await request.post('/api/admin/manage/team', { headers: superHeaders, data: { name: 'Test admin', username, role: 'manager', active: true, password: 'manager-password-123' } });
  expect(created.ok()).toBe(true);
  const login = await request.post('/api/admin/login', { data: { username, password: 'manager-password-123' } });
  expect(login.ok()).toBe(true);
  const adminHeaders = { Cookie: login.headers()['set-cookie'].split(';')[0] };
  const settings = await (await request.get('/api/admin/manage/settings', { headers: adminHeaders })).json();
  expect(settings.role).toBe('manager'); expect(settings.team).toEqual([]);
  expect((await request.get('/api/admin/provider-credentials', { headers: adminHeaders })).status()).toBe(403);
  expect((await request.post('/api/admin/provider-credentials', { headers: adminHeaders, data: { name: 'yoco-secret', value: 'sk_test_fake' } })).status()).toBe(403);
  expect((await request.post('/api/admin/manage/team', { headers: adminHeaders, data: { name: 'Another', username: `${username}.2`, role: 'staff', active: true, password: 'long-password-123' } })).status()).toBe(403);
  const operational = await request.post('/api/admin/manage/settings', { headers: adminHeaders, data: settings.settings });
  expect(operational.ok()).toBe(true);
  const forbidden = await request.post('/api/admin/manage/settings', { headers: adminHeaders, data: { ...settings.settings, onlinePaymentsEnabled: !settings.settings.onlinePaymentsEnabled } });
  expect(forbidden.status()).toBe(403);
});
