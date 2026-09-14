import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { updateMenuItem, deleteMenuItem, MenuValidationError } from '@/lib/menu-store';

async function requireAdmin() {
  const store = await cookies();
  return isValidAdminToken(store.get(ADMIN_COOKIE)?.value);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Provide fields to update.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const item = updateMenuItem(id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      category: typeof body.category === 'string' ? body.category : undefined,
      price: typeof body.price === 'number' ? body.price : undefined,
      available: typeof body.available === 'boolean' ? body.available : undefined,
      isSpecial: typeof body.isSpecial === 'boolean' ? body.isSpecial : undefined,
      specialLabel: body.specialLabel === null ? null : typeof body.specialLabel === 'string' ? body.specialLabel : undefined,
      specialPrice: body.specialPrice === null ? null : typeof body.specialPrice === 'number' ? body.specialPrice : undefined,
    });
    return NextResponse.json({ item }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof MenuValidationError ? error.message : 'Could not update that item.';
    return NextResponse.json({ code: 'INVALID_ITEM', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id } = await context.params;
  deleteMenuItem(id);
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
