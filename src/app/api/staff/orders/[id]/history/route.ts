import { cookies } from 'next/headers';
import { STAFF_COOKIE, isValidStaffToken } from '@/lib/staff-auth';
import { getOrderEvents } from '@/lib/orders';
import { paymentAudit } from '@/lib/payments';
export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  if (!isValidStaffToken((await cookies()).get(STAFF_COOKIE)?.value)) return Response.json({message:'Staff access required.'}, {status:401});
  const id=(await context.params).id;
  return Response.json({events:getOrderEvents(id),payment:paymentAudit(id)}, {headers:{'Cache-Control':'no-store'}});
}
