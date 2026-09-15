import { cookies } from 'next/headers';
import { revokeSession } from '@/lib/team';
import { NextResponse } from 'next/server';
import { STAFF_COOKIE } from '@/lib/staff-auth';

export async function POST() {
  revokeSession((await cookies()).get(STAFF_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(STAFF_COOKIE);
  return response;
}
