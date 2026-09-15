import { teamSession } from '@/lib/team';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidStaffToken, STAFF_COOKIE } from '@/lib/staff-auth';
import { OrderTransitionError, updateOrderStatus, type OrderStatus } from '@/lib/orders';
import { deliverOrderEmail } from '@/lib/email';


const VALID_STATUSES: OrderStatus[] = ['received', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  if (!isValidStaffToken(store.get(STAFF_COOKIE)?.value)) {
    return NextResponse.json({ code: 'STAFF_AUTH_REQUIRED', message: 'Enter the staff access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.status !== 'string' || !VALID_STATUSES.includes(body.status as OrderStatus)) {
    return NextResponse.json({ code: 'INVALID_STATUS', message: 'Provide a valid status.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const order = updateOrderStatus(id, body.status as OrderStatus, body.expectedStatus as OrderStatus | undefined, teamSession(store.get(STAFF_COOKIE)?.value) ? 'team:'+teamSession(store.get(STAFF_COOKIE)?.value)!.id : 'shared-staff-tablet');
    if (['accepted', 'ready', 'completed'].includes(order.status)) await deliverOrderEmail(order, order.status as 'accepted' | 'ready' | 'completed').catch(() => false);
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof OrderTransitionError ? error.message : 'Could not update that order.';
    return NextResponse.json({ code: 'TRANSITION_REJECTED', message }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }
}
