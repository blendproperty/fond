import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, resolveSession } from '@/lib/auth';
import { listOrderRequests, recordOrderRequest } from '@/lib/order-requests';

// Fail closed: the scaffold must never claim a real order was placed, paid
// for, or sent to a kitchen. See src/lib/yoco.ts - that gateway throws until
// Yoco confirms a supported incoming-order integration (none exists as of
// the dated evidence in PROJECT_CONTEXT.md). What changed here: a signed-in
// request is now durably recorded (src/lib/order-requests.ts) instead of
// only living in client memory, so real demand isn't lost - but the
// response is unchanged and still fails closed.
export async function POST(request: Request) {
  const store = await cookies();
  const user = resolveSession(store.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ code: 'AUTH_REQUIRED', message: 'Sign in to preview an order.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.lines) || typeof body.collectionTime !== 'string') {
    return NextResponse.json({ code: 'INVALID_INPUT', message: 'A basket and collection time are required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    recordOrderRequest(user.id, body.lines, body.collectionTime);
  } catch (error) {
    return NextResponse.json({ code: 'INVALID_BASKET', message: error instanceof Error ? error.message : 'Invalid basket.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  return NextResponse.json(
    { code: 'ORDERING_NOT_ENABLED', message: 'Live ordering is not enabled. No payment or kitchen order has been created. Your request has been saved.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}

// Signed-in reorder history, now server-backed instead of session-only.
export async function GET() {
  const store = await cookies();
  const user = resolveSession(store.get(SESSION_COOKIE)?.value);
  if (!user) {
    return NextResponse.json({ code: 'AUTH_REQUIRED', message: 'Sign in to see your requests.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ requests: listOrderRequests(user.id) }, { headers: { 'Cache-Control': 'no-store' } });
}
