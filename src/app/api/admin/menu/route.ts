import { NextResponse } from 'next/server';
import { getFullMenu, createMenuItem, MenuValidationError } from '@/lib/menu-store';
import {currentAdmin} from '@/lib/admin-request';

export async function GET() {
  if (!(await currentAdmin())) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ menu: getFullMenu() }, { headers: { 'Cache-Control': 'no-store' } });
}

// Add a new menu item — e.g. a limited-time special that isn't in the
// regular menu at all, not just an existing item marked as special.
export async function POST(request: Request) {
  const admin=await currentAdmin();
  if (!admin) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== 'string' || typeof body.name !== 'string' || typeof body.category !== 'string' || typeof body.price !== 'number') {
    return NextResponse.json({ code: 'INVALID_REQUEST', message: 'Provide an id, name, category and price.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const item = createMenuItem({
      id: body.id,
      name: body.name,
      description: typeof body.description === 'string' ? body.description : '',
      category: body.category,
      price: body.price,
      symbol: typeof body.symbol === 'string' ? body.symbol : undefined,
      diet: Array.isArray(body.diet) ? body.diet : undefined,
      prepMinutes:typeof body.prepMinutes==='number'?body.prepMinutes:undefined,
    },admin.actor);
    return NextResponse.json({ item }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof MenuValidationError ? error.message : 'Could not add that item.';
    return NextResponse.json({ code: 'INVALID_ITEM', message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
