import { cookies } from 'next/headers';
import { revokeSession } from '@/lib/team';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/admin-auth';

export async function POST() {
  revokeSession((await cookies()).get(ADMIN_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
