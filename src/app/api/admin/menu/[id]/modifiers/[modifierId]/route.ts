import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { removeModifier, MenuValidationError } from '@/lib/menu-store';

async function requireAdmin() {
  const store = await cookies();
  return isValidAdminToken(store.get(ADMIN_COOKIE)?.value);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; modifierId: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id, modifierId } = await context.params;
  try {
    const item = removeModifier(id, modifierId);
    return NextResponse.json({ item }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof MenuValidationError ? error.message : 'Could not remove that modifier.';
    return NextResponse.json({ code: 'INVALID_MODIFIER', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
