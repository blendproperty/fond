import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminRole } from '@/lib/admin-auth';
import { teamSession, loginAllowed, recordLoginFailure, clearLoginFailures } from '@/lib/team';
import { activateTwoFactor, beginTwoFactor, disableTwoFactor, twoFactorActive } from '@/lib/two-factor';
import { validRequestOrigin } from '@/lib/request-origin';

const headers = { 'Cache-Control': 'no-store' };
async function member() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!adminRole(token) || !token?.startsWith('team_')) return null;
  return teamSession(token);
}
export async function GET() {
  const current = await member();
  if (!current) return Response.json({ message: 'Sign in with a named admin account.' }, { status: 403, headers });
  return Response.json({ active: twoFactorActive(current.id) }, { headers });
}
export async function POST(request: Request) {
  const current = await member();
  if (!current) return Response.json({ message: 'Sign in with a named admin account.' }, { status: 403, headers });
  if (!validRequestOrigin(request)) return Response.json({ message: 'Invalid origin.' }, { status: 403, headers });
  const body = await request.json().catch(() => null);
  try {
    if (body?.action === 'begin') return Response.json(beginTwoFactor(current.id, current.username), { headers });
    if (body?.action === 'activate' && typeof body.code === 'string') return Response.json({ active: true, recoveryCodes: activateTwoFactor(current.id, body.code) }, { headers });
    if (body?.action === 'disable' && typeof body.code === 'string' && body.code.length <= 64) {
      const key = `2fa-disable:${current.id}`;
      if (!loginAllowed(key)) return Response.json({ message: 'Too many attempts. Try again in 15 minutes.' }, { status: 429, headers });
      try { disableTwoFactor(current.id, body.code); }
      catch (error) { recordLoginFailure(key); throw error; }
      clearLoginFailures(key);
      return Response.json({ active: false, signInRequired: true }, { headers });
    }
    return Response.json({ message: 'Invalid 2FA request.' }, { status: 400, headers });
  } catch (error) { return Response.json({ message: error instanceof Error ? error.message : 'Could not enable 2FA.' }, { status: 400, headers }); }
}
