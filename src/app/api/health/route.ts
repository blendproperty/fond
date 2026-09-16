import { settings,orderingAvailable } from '@/lib/management';
import { onlinePaymentsConfigured,yocoCredentialMode } from '@/lib/payments';
import { getDb } from '@/lib/db';

export function GET() {
  try {
    getDb().prepare('SELECT 1').get();
    const s=settings(),credentialMode=yocoCredentialMode();
    const payments=credentialMode==='live'&&s.onlinePaymentsEnabled&&onlinePaymentsConfigured()?'in-person-and-yoco':credentialMode==='test'&&s.allowTestPayments&&onlinePaymentsConfigured()?'yoco-sandbox':'in-person';
    return Response.json({status:'ok',application:'fond',mode:'ordering',liveOrdering:orderingAvailable(s),payments}, {headers:{'Cache-Control':'no-store'}});
  } catch {
    return Response.json({status:'unavailable',application:'fond'}, {status:503,headers:{'Cache-Control':'no-store'}});
  }
}
