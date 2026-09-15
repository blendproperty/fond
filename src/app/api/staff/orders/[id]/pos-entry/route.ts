import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { STAFF_COOKIE, isValidStaffToken } from '@/lib/staff-auth';
import { teamSession } from '@/lib/team';
import { recordPosEntry } from '@/lib/orders';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (!isValidStaffToken(token)) return NextResponse.json({ message: 'Staff sign-in required.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.posReference !== 'string') return NextResponse.json({ message: 'Enter the Yoco order reference.' }, { status: 400 });
  try {
    const order = recordPosEntry((await context.params).id, body.posReference, teamSession(token) ? `team:${teamSession(token)!.id}` : 'shared-staff-tablet');
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not record Yoco entry.' }, { status: 409 }); }
}
