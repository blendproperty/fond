import {counterAvailable} from '@/lib/counter-rewards';
import {customerCheckoutMode} from '@/lib/payments';
import { settings,orderingAvailable,publicContent } from '@/lib/management';
import {currentKitchenDelayMinutes} from '@/lib/kitchen-workload';
export function GET(){const s=settings(),paymentMode=customerCheckoutMode();return Response.json({counterRewards:counterAvailable(),settings:s,open:orderingAvailable(s),content:publicContent(),onlinePayments:false,paymentMode,queueDelayMinutes:currentKitchenDelayMinutes(s.preparationParallelOrders)},{headers:{'Cache-Control':'no-store'}});}
