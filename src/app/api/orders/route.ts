import { createCustomerCheckout,customerCheckoutMode,paymentStatus } from '@/lib/payments';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, resolveSession } from '@/lib/auth';
import { deliverOrderEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import { SubmissionConflictError, createOrder, getOrderByReference } from '@/lib/orders';

// Customer orders enter FOND's staff queue. Hosted payment is optional.
export async function POST(request: Request) {
  const user = resolveSession((await cookies()).get(SESSION_COOKIE)?.value);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.lines) || typeof body.collectionTime !== 'string' || typeof body.customerName !== 'string') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Missing basket, name or collection time.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const submissionKey = request.headers.get('Idempotency-Key');
    if (!submissionKey) return NextResponse.json({message:'A submission key is required. Refresh and try again.'}, {status:400});
    if(body.fulfillment==='delivery'&&customerCheckoutMode()==='none')throw new Error('Delivery ordering requires secure online payment, which is not available right now.');
    const order = createOrder({
      submissionKey,
      customerName: body.customerName,
      note: typeof body.note === 'string' ? body.note : null,
      lines: body.lines,
      collectionTime: body.collectionTime,
      source: 'customer',
      fulfillment: body.fulfillment === 'delivery' ? 'delivery' : 'collection',
      contactNumber: typeof body.contactNumber === 'string' ? body.contactNumber : null,
      company: typeof body.company === 'string' ? body.company : null,
      building: typeof body.building === 'string' ? body.building : null,
      whatsappOptIn: !!body.whatsappOptIn,
      smsOptIn: !!body.smsOptIn,
      userId: user?.id,
      customerEmail: user?.email,
      paymentMethod:body.paymentMethod==='yoco_online'?'yoco_online':'pay_at_collection',
    });
    const redirectUrl=order.paymentMethod==='yoco_online'?await createCustomerCheckout(order.reference):null;
    if (user?.emailVerified) await deliverOrderEmail(order, 'received').catch(() => false);
    return NextResponse.json(
      {
        reference: order.reference,
        status: order.status,
        totalCents: order.totalCents,
        message: 'Your order has been sent to FOND. Please pay at the counter on collection.',
        paymentMethod:order.paymentMethod,
        redirectUrl,
        estimatedPrepMinutes:order.estimatedPrepMinutes,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json({ code: 'INVALID_ORDER', message: error instanceof Error ? error.message : 'Could not place that order.' }, { status: error instanceof SubmissionConflictError ? 409 : 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

// Reference lookup also supports guests without an account.
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get('reference');
  if (!reference) {
    return NextResponse.json({ code: 'REFERENCE_REQUIRED', message: 'Provide a reference to look up.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const order = getOrderByReference(reference.trim().toUpperCase());
  if (!order) {
    return NextResponse.json({ code: 'NOT_FOUND', message: 'No order found with that reference.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json(
    { reference: order.reference, status: order.status, totalCents: order.totalCents, collectionTime: order.collectionTime, fulfillment:order.fulfillment,paymentMethod:order.paymentMethod,payment:paymentStatus(order.id),estimatedPrepMinutes:order.estimatedPrepMinutes },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
