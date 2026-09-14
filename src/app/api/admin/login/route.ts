import { NextResponse } from 'next/server';
import { checkAdminCode, ADMIN_COOKIE } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.code !== 'string') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Enter the admin access code.' }, { status: 400 });
  }
  let token: string | null;
  try {
    token = checkAdminCode(body.code);
  } catch {
    return NextResponse.json({ code: 'NOT_CONFIGURED', message: 'Admin access has not been configured on this server (FOND_ADMIN_CODE is unset).' }, { status: 503 });
  }
  if (!token) {
    return NextResponse.json({ code: 'INCORRECT_CODE', message: 'Incorrect access code.' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
