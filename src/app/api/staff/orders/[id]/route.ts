import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidStaffToken, STAFF_COOKIE } from '@/lib/staff-auth';
import { OrderTransitionError, updateOrderStatus, type OrderStatus } from '@/lib/orders';
import { sendWhatsAppNotification } from '@/lib/whatsapp';

const VALID_STATUSES: OrderStatus[] = ['received', 'accepted', 'ready', 'completed', 'cancelled'];
// Only these transitions are worth telling the customer about via WhatsApp.
const NOTIFY_TEMPLATE: Partial<Record<OrderStatus, 'order_accepted' | 'order_ready'>> = {
  accepted: 'order_accepted',
  ready: 'order_ready',
};

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
    const order = updateOrderStatus(id, body.status as OrderStatus, body.expectedStatus as OrderStatus | undefined);
    // Best-effort WhatsApp notification — never blocks or fails the status
    // update itself; see src/lib/whatsapp.ts for what's still needed before
    // this actually sends anything (a Meta WhatsApp Business API key).
    const template = NOTIFY_TEMPLATE[order.status];
    if (template && order.whatsappOptIn && order.contactNumber) {
      void sendWhatsAppNotification({ toE164: order.contactNumber, templateName: template, customerName: order.customerName, reference: order.reference });
    }
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof OrderTransitionError ? error.message : 'Could not update that order.';
    return NextResponse.json({ code: 'TRANSITION_REJECTED', message }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }
}
