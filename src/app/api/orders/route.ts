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
  // The fail-closed 503 below is unconditional - anonymous or signed in,
  // valid basket or not, nothing is ever accepted as a real order here.
  // Sign-in only controls the *bonus* behaviour: durably recording the
  // request so it isn't lost. An anonymous or malformed request still gets
  // the plain original contract (no basket validation attempted, nothing
  // stored) so this stays backward compatible with a client that never
  // signs in - see tests/... and e2e/ordering.spec.ts.
  const store = await cookies();
  const user = resolveSession(store.get(SESSION_COOKIE)?.value);

  let saved = false;
  if (user) {
    const body = await request.json().catch(() => null);
    if (body && Array.isArray(body.lines) && typeof body.collectionTime === 'string') {
      try {
        recordOrderRequest(user.id, body.lines, body.collectionTime);
        saved = true;
      } catch {
        // Invalid basket from a signed-in user: fall through to the same
        // fail-closed response everyone else gets. This endpoint's only
        // job is to never claim a real order happened, not to validate
        // baskets - src/lib/menu.ts's quoteCart already does that
        // client-side for the demo preview.
      }
    }
  }

  return NextResponse.json(
    {
      code: 'ORDERING_NOT_ENABLED',
      message: saved
        ? 'Live ordering is not enabled. No payment or kitchen order has been created. Your request has been saved.'
        : 'Live ordering is not enabled. No payment or kitchen order has been created.',
    },
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
