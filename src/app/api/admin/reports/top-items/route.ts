import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { getFullMenu, getItemSalesStats } from '@/lib/menu-store';

// Compatibility endpoint: rank sold items only; zero sales are not evidence of slow performance.
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
  const slow = [...ranked].reverse().filter((r) => r.item.available !== false && r.quantitySold > 0).slice(0, 10);
  return NextResponse.json({ top, slow }, { headers: { 'Cache-Control': 'no-store' } });
}
