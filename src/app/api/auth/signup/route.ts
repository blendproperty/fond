import { NextResponse } from 'next/server';
import { AuthError, SESSION_COOKIE, signUp } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ code: 'INVALID_INPUT', message: 'Email and password are required.' }, { status: 400 });
  }
  try {
    const { token, user } = signUp(body.email, body.password);
    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ code: 'AUTH_ERROR', message: error.message }, { status: 400 });
    throw error;
  }
}
