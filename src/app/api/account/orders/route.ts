import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, resolveSession } from '@/lib/auth';
import { listCustomerOrders } from '@/lib/orders';
import { paymentStatus } from '@/lib/payments';

export async function GET() {
  const user = resolveSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return NextResponse.json({ message: 'Sign in to see your orders.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const orders = listCustomerOrders(user.id).map(order => ({
    reference: order.reference, displayReference:order.displayReference, status: order.status, createdAt: order.createdAt,
    collectionTime: order.collectionTime, totalCents: order.totalCents,
    lines: order.lines.map(line => ({ name: line.name, quantity: line.quantity, subtotalCents: line.subtotalCents })),
    fulfillment: order.fulfillment, payment: paymentStatus(order.id),
  }));
  return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store' } });
}
