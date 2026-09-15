import { cookies } from 'next/headers';
import { SESSION_COOKIE, resolveSession } from '@/lib/auth';
import { requestVerification, verifyEmail } from '@/lib/email';

async function user() { return resolveSession((await cookies()).get(SESSION_COOKIE)?.value); }
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  const current = await user();
  if (!current) return Response.json({ message: 'Sign in first.' }, { status: 401, headers });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: 'Invalid origin.' }, { status: 403, headers });
  try { return Response.json(await requestVerification(current), { headers }); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : 'Could not send verification email.' }, { status: 400, headers }); }
}
export async function PATCH(request: Request) {
  const current = await user();
  if (!current) return Response.json({ message: 'Sign in first.' }, { status: 401, headers });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: 'Invalid origin.' }, { status: 403, headers });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.code !== 'string') return Response.json({ message: 'Enter the verification code.' }, { status: 400, headers });
  try { verifyEmail(current.id, body.code); return Response.json({ verified: true }, { headers }); }
  catch (error) { return Response.json({ message: error instanceof Error ? error.message : 'Could not verify email.' }, { status: 400, headers }); }
}
