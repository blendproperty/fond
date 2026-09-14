import { NextResponse } from 'next/server';
import { checkStaffCode, STAFF_COOKIE } from '@/lib/staff-auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.code !== 'string') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Enter the staff access code.' }, { status: 400 });
  }
  let token: string | null;
  try {
    token = checkStaffCode(body.code);
  } catch {
    return NextResponse.json({ code: 'NOT_CONFIGURED', message: 'Staff access has not been configured on this server (FOND_STAFF_CODE is unset).' }, { status: 503 });
  }
  if (!token) {
    return NextResponse.json({ code: 'INCORRECT_CODE', message: 'Incorrect access code.' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
