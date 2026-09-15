import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { getFullMenu, getItemSalesStats } from '@/lib/menu-store';

// "Top / slow movers" report for the admin Reports section — quantity sold
// per available menu item, ranked both ways, so slow-selling items can be
// discounted or featured and best-sellers can be protected from going
// unavailable. Items never ordered still appear (with 0) so they aren't
// silently missing from the "not moving" list.
export async function GET() {
  const store = await cookies();
  if (!isValidAdminToken(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ code: 'ADMIN_AUTH_REQUIRED', message: 'Enter the admin access code.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const menu = getFullMenu();
  const stats = getItemSalesStats();
  const ranked = menu
    .map((item) => ({ item, quantitySold: stats.get(item.id) ?? 0 }))
    .sort((a, b) => b.quantitySold - a.quantitySold);
  const top = ranked.filter((r) => r.quantitySold > 0).slice(0, 10);
  const slow = [...ranked].reverse().filter((r) => r.item.available !== false).slice(0, 10);
  return NextResponse.json({ top, slow }, { headers: { 'Cache-Control': 'no-store' } });
}
