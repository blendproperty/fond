import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, resolveSession } from '@/lib/auth';

export async function GET() {
  const store = await cookies();
  const user = resolveSession(store.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
}
