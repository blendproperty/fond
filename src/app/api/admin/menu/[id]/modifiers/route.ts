import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { addModifier, MenuValidationError } from '@/lib/menu-store';

async function requireAdmin() {
  const store = await cookies();
  return isValidAdminToken(store.get(ADMIN_COOKIE)?.value);
}

// Add a single "add this / remove this" option to a menu item, e.g.
// "Extra cheese" at +R15 or "No onion" at R0.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || typeof body.price !== 'number') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Provide a modifier name and price.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const item = addModifier(id, { name: body.name, price: body.price });
    return NextResponse.json({ item }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof MenuValidationError ? error.message : 'Could not add that modifier.';
    return NextResponse.json({ code: 'INVALID_MODIFIER', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
