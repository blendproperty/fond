import {customerCheckoutMode} from '@/lib/payments';
import { settings,orderingAvailable,publicContent } from '@/lib/management';
import {currentKitchenDelayMinutes} from '@/lib/kitchen-workload';
export function GET(){const s=settings(),paymentMode=customerCheckoutMode();return Response.json({settings:s,open:orderingAvailable(s),content:publicContent(),onlinePayments:paymentMode!=='none',paymentMode,queueDelayMinutes:currentKitchenDelayMinutes(s.preparationParallelOrders)},{headers:{'Cache-Control':'no-store'}});}
