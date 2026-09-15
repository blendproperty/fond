import { onlinePaymentsConfigured } from '@/lib/payments';
import { settings,orderingAvailable,publicContent } from '@/lib/management';
export function GET(){const s=settings();return Response.json({settings:s,open:orderingAvailable(s),content:publicContent(),onlinePayments:s.onlinePaymentsEnabled&&onlinePaymentsConfigured()},{headers:{'Cache-Control':'no-store'}});}
