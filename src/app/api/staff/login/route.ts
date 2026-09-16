import { loginAllowed, loginMember, recordLoginFailure, clearLoginFailures } from '@/lib/team';
import { NextResponse } from 'next/server';
import { checkStaffCode, STAFF_COOKIE } from '@/lib/staff-auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || (typeof body.code !== 'string' && (typeof body.username !== 'string' || typeof body.password !== 'string'))) {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Enter the staff access code.' }, { status: 400 });
  }
  const attemptKey='staff-'+(typeof body.username==='string'?body.username.trim().toLowerCase():'shared');
  if (!loginAllowed(attemptKey)) return NextResponse.json({message:'Too many attempts. Try again in 15 minutes.'},{status:429});
  let token: string | null;
  try {
    if (body.username) {
      if (body.password.length > 128) return NextResponse.json({message:'Invalid credentials.'},{status:400});
      const result=loginMember(body.username,body.password,typeof body.twoFactorCode==='string'?body.twoFactorCode:undefined);
      token=result?.token ?? null;
    } else { token = checkStaffCode(body.code); }
  } catch {
    return NextResponse.json({ code: 'NOT_CONFIGURED', message: 'Staff access has not been configured on this server (FOND_STAFF_CODE is unset).' }, { status: 503 });
  }
  if (!token) {
    recordLoginFailure(attemptKey);
    return NextResponse.json({ code: 'INCORRECT_CODE', message: 'Incorrect access code.' }, { status: 401 });
  }
  clearLoginFailures(attemptKey);
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
