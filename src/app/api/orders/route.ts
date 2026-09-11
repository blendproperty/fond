import { NextResponse } from 'next/server';
// Fail closed: the scaffold must never claim a real order was placed.
export async function POST() {
 return NextResponse.json({ code: 'ORDERING_NOT_ENABLED', message: 'Live ordering is not enabled. No payment or kitchen order has been created.' }, {status:503,headers:{'Cache-Control':'no-store'}});
}
