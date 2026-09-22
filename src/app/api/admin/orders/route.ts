import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { searchOrders, type OrderStatus, type FulfillmentType } from '@/lib/orders';

const VALID_STATUSES: OrderStatus[] = ['received', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
const VALID_FULFILLMENT: FulfillmentType[] = ['collection', 'delivery'];

export async function GET(request: Request) {
  const store = await cookies();
  if (!isValidAdminToken(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status');
  const fulfillmentParam = url.searchParams.get('fulfillment');
  const query = url.searchParams.get('q') ?? undefined;
  const status = statusParam && VALID_STATUSES.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined;
  const fulfillment = fulfillmentParam && VALID_FULFILLMENT.includes(fulfillmentParam as FulfillmentType) ? (fulfillmentParam as FulfillmentType) : undefined;
  const orders = searchOrders({ status, fulfillment, query });
  return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'no-store' } });
}
