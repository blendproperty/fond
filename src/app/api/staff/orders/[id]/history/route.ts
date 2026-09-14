import { cookies } from 'next/headers';
import { STAFF_COOKIE, isValidStaffToken } from '@/lib/staff-auth';
import { getOrderEvents } from '@/lib/orders';
export async function GET(_request: Request, context: {params: Promise<{id: string}>}) {
  if (!isValidStaffToken((await cookies()).get(STAFF_COOKIE)?.value)) return Response.json({message:'Staff access required.'}, {status:401});
  return Response.json({events:getOrderEvents((await context.params).id)}, {headers:{'Cache-Control':'no-store'}});
}
