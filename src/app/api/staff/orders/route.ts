import { paymentStatus } from '@/lib/payments';
import { after } from 'next/server';
import { processNotifications } from '@/lib/notifications';
import { teamSession } from '@/lib/team';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidStaffToken, STAFF_COOKIE } from '@/lib/staff-auth';
import { SubmissionConflictError, createOrder, listActiveOrders } from '@/lib/orders';

async function requireStaff() {
  const store = await cookies();
  return isValidStaffToken(store.get(STAFF_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ code: 'STAFF_AUTH_REQUIRED', message: 'Enter the staff access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  after(processNotifications);
  return NextResponse.json({ orders: listActiveOrders().map(o=>({...o,payment:paymentStatus(o.id)})) }, { headers: { 'Cache-Control': 'no-store' } });
}

// Manual order entry from the facility tablet - walk-ins and phone orders
// staff type in directly. These start life already "accepted" since a
// person took the order at the counter.
export async function POST(request: Request) {
  if (!(await requireStaff())) {
    return NextResponse.json({ code: 'STAFF_AUTH_REQUIRED', message: 'Enter the staff access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.lines) || typeof body.collectionTime !== 'string' || typeof body.customerName !== 'string') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Missing basket, name or collection time.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const submissionKey = request.headers.get('Idempotency-Key');
    if (!submissionKey) return NextResponse.json({message:'A submission key is required. Refresh and try again.'}, {status:400});
    const order = createOrder({
      submissionKey,
      customerName: body.customerName,
      note: typeof body.note === 'string' ? body.note : null,
      lines: body.lines,
      collectionTime: body.collectionTime,
      source: 'staff',
      actor: teamSession((await cookies()).get(STAFF_COOKIE)?.value) ? 'team:'+teamSession((await cookies()).get(STAFF_COOKIE)?.value)!.id : 'shared-staff-tablet',
    });
    return NextResponse.json({ order }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ code: 'INVALID_ORDER', message: error instanceof Error ? error.message : 'Could not place that order.' }, { status: error instanceof SubmissionConflictError ? 409 : 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
