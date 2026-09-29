import {counterOrderSummary,prepareCounterOrderReceipt,skipCounterOrder} from '@/lib/counter-order';
import {validRequestOrigin} from '@/lib/request-origin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { STAFF_COOKIE, isValidStaffToken } from '@/lib/staff-auth';
import { teamSession } from '@/lib/team';
import { recordPosEntry } from '@/lib/orders';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (!isValidStaffToken(token)) return NextResponse.json({ message: 'Staff sign-in required.' }, { status: 401 });
  if(!validRequestOrigin(request))return NextResponse.json({message:'Invalid origin.'},{status:403});
  const body = await request.json().catch(() => null);
  if (!body || typeof body.posReference !== 'string') return NextResponse.json({ message: 'Enter the Yoco order reference.' }, { status: 400 });
  try {
    const id=(await context.params).id,actor=teamSession(token)?`team:${teamSession(token)!.id}`:'shared-staff-tablet';
    const verify=counterOrderSummary(id)?body.skipRewards===true?()=>skipCounterOrder(id,actor):await prepareCounterOrderReceipt(id,body.posReference,typeof body.receiptDate==='string'?body.receiptDate:'',actor):undefined;
    const order=recordPosEntry(id,body.posReference,actor,verify);
    return NextResponse.json({ order }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : 'Could not record Yoco entry.' }, { status: 409 }); }
}
