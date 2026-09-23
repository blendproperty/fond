import { NextResponse } from 'next/server';
import { addModifier, MenuValidationError } from '@/lib/menu-store';
import {currentAdmin} from '@/lib/admin-request';

// Add a single "add this / remove this" option to a menu item, e.g.
// "Extra cheese" at +R15 or "No onion" at R0.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin=await currentAdmin();
  if (!admin) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || typeof body.price !== 'number') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Provide a modifier name and price.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const item = addModifier(id, { name: body.name, price: body.price },admin.actor);
    return NextResponse.json({ item }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof MenuValidationError ? error.message : 'Could not add that modifier.';
    return NextResponse.json({ code: 'INVALID_MODIFIER', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
