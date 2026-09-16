import { onlinePaymentsConfigured,yocoCredentialMode } from '@/lib/payments';
import { settings,orderingAvailable,publicContent } from '@/lib/management';
export function GET(){const s=settings();return Response.json({settings:s,open:orderingAvailable(s),content:publicContent(),onlinePayments:yocoCredentialMode()==='live'&&s.onlinePaymentsEnabled&&onlinePaymentsConfigured()},{headers:{'Cache-Control':'no-store'}});}
