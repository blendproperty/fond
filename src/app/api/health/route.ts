import { settings,orderingAvailable } from '@/lib/management';
import { onlinePaymentsConfigured } from '@/lib/payments';
import { getDb } from '@/lib/db';

export function GET() {
  try {
    getDb().prepare('SELECT 1').get();
    return Response.json({status:'ok',application:'fond',mode:'ordering',liveOrdering:orderingAvailable(settings()),payments:settings().onlinePaymentsEnabled&&onlinePaymentsConfigured()?'in-person-and-yoco':'in-person'}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({status:'unavailable',application:'fond'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
