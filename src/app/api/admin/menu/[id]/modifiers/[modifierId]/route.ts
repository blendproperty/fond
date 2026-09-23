import { NextResponse } from 'next/server';
import { removeModifier, MenuValidationError } from '@/lib/menu-store';
import {currentAdmin} from '@/lib/admin-request';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; modifierId: string }> }) {
  const admin=await currentAdmin();
  if (!admin) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id, modifierId } = await context.params;
  try {
    const item = removeModifier(id, modifierId,admin.actor);
    return NextResponse.json({ item }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof MenuValidationError ? error.message : 'Could not remove that modifier.';
    return NextResponse.json({ code: 'INVALID_MODIFIER', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
