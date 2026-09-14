import { NextResponse } from 'next/server';
import { getAvailableMenu } from '@/lib/menu-store';

// Live menu for the customer PWA and the facility staff tablet. Backed by
// the menu_items table (see src/lib/menu-store.ts) so price/availability/
// specials changes made in /admin take effect immediately for anyone
// ordering, without a redeploy.
export async function GET() {
  return NextResponse.json({ menu: getAvailableMenu() }, { headers: { 'Cache-Control': 'no-store' } });
}
