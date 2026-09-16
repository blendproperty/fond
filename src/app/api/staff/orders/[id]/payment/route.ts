import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { STAFF_COOKIE, isValidStaffToken } from '@/lib/staff-auth';
import { teamSession } from '@/lib/team';
import { getDb } from '@/lib/db';
import { recordPayment } from '@/lib/business-data';
import { paymentStatus } from '@/lib/payments';

export async function POST(request:Request,context:{params:Promise<{id:string}>}){
  const store=await cookies(),token=store.get(STAFF_COOKIE)?.value;
  if(!isValidStaffToken(token))return NextResponse.json({message:'Staff sign-in required.'},{status:401});
  const body=await request.json().catch(()=>null),method=body?.method;
  if(method!=='cash'&&method!=='card')return NextResponse.json({message:'Choose cash or card.'},{status:400});
  const {id}=await context.params,db=getDb();
  const order=db.prepare('SELECT total_cents,status FROM orders WHERE id=?').get(id) as {total_cents:number;status:string}|undefined;
  if(!order)return NextResponse.json({message:'Order not found.'},{status:404});
  if(order.status!=='ready')return NextResponse.json({message:'Record payment when the order is ready for handover.'},{status:409});
  const paid=(db.prepare('SELECT coalesce(sum(amount_cents),0) AS n FROM payment_records WHERE order_id=?').get(id) as {n:number}).n;
  const outstanding=order.total_cents-paid;
  if(outstanding<=0)return NextResponse.json({message:'This order is already fully paid.'},{status:409});
  const supplied=typeof body.reference==='string'?body.reference.trim():'';
  if(method==='card'&&!supplied)return NextResponse.json({message:'Enter the card terminal receipt reference.'},{status:400});
  const reference=supplied||`cash:${id}:${randomUUID()}`;
  try{
    const session=teamSession(token),actor=session?`team:${session.id}`:'shared-staff-tablet';
    recordPayment({orderId:id,amountCents:outstanding,method,reference},actor);
    return NextResponse.json({payment:paymentStatus(id)},{headers:{'Cache-Control':'no-store'}});
  }catch(error){return NextResponse.json({message:error instanceof Error?error.message:'Could not record payment.'},{status:409});}
}
