import { NextResponse } from 'next/server';
import { createOrder, getOrderByReference } from '@/lib/orders';

// Real order intake for the customer PWA. Yoco has been dropped entirely
// (2026-09-14 decision) - this endpoint now genuinely accepts orders into
// FOND's own queue, which staff work from on the facility tablet (see
// /staff and src/app/api/staff/orders/route.ts). Payment is not handled
// here: it happens in person with staff, independent of this app.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.lines) || typeof body.collectionTime !== 'string' || typeof body.customerName !== 'string') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Missing basket, name or collection time.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const order = createOrder({
      customerName: body.customerName,
      note: typeof body.note === 'string' ? body.note : null,
      lines: body.lines,
      collectionTime: body.collectionTime,
      source: 'customer',
    });
    return NextResponse.json(
      {
        reference: order.reference,
        status: order.status,
        totalCents: order.totalCents,
        message: 'Your order has been sent to FOND. Please pay at the counter on collection.',
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json({ code: 'INVALID_ORDER', message: error instanceof Error ? error.message : 'Could not place that order.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

// Reference lookup so a customer can check their order's status without an
// account - there is no login on the customer side of this app.
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
    { reference: order.reference, status: order.status, totalCents: order.totalCents, collectionTime: order.collectionTime },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
