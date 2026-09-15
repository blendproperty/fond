import type { OrderRecord } from './orders';

export type QueueOrder = Pick<OrderRecord,'status'|'fulfillment'|'posRecordedAt'|'posRequired'|'createdAt'|'updatedAt'|'totalCents'> & {
  payment?: {paidCents:number;checkout:string|null;checkoutUpdatedAt?:string|null};
};
export type QueueLane = 'new'|'payment'|'yoco'|'preparing'|'delivery'|'collection';

export const QUEUE_LANES: {key:QueueLane;title:string;targetMinutes:number}[] = [
  {key:'new',title:'New',targetMinutes:5},
  {key:'payment',title:'Awaiting Yoco payment confirmation',targetMinutes:10},
  {key:'yoco',title:'Added to Yoco system',targetMinutes:5},
  {key:'preparing',title:'Preparing',targetMinutes:20},
  {key:'delivery',title:'Ready for delivery',targetMinutes:10},
  {key:'collection',title:'Ready for collection',targetMinutes:10},
];

export function queueLane(order: QueueOrder): QueueLane {
  if (order.status === 'ready') return order.fulfillment === 'delivery' ? 'delivery' : 'collection';
  if (order.status === 'preparing') return 'preparing';
  if (order.status === 'accepted') return order.posRecordedAt ? 'yoco' : 'new';
  if (order.status === 'received' && ['creating','pending'].includes(order.payment?.checkout??'') && (order.payment?.paidCents??0) < order.totalCents) return 'payment';
  return 'new';
}

export function laneEnteredAt(order: QueueOrder, lane: QueueLane): string {
  if (lane === 'payment') return order.payment?.checkoutUpdatedAt??order.createdAt;
  if (lane === 'yoco') return order.posRecordedAt??order.updatedAt;
  if (lane === 'new' && order.status === 'received') return order.createdAt;
  return order.updatedAt;
}

export function laneTiming(order: QueueOrder, now: number, preparationMinutes = 20) {
  const lane=queueLane(order);
  const targetMinutes=lane==='preparing'?preparationMinutes:QUEUE_LANES.find(item=>item.key===lane)!.targetMinutes;
  const elapsedMinutes=Math.max(0,Math.floor((now-Date.parse(laneEnteredAt(order,lane)))/60000));
  return {lane,targetMinutes,elapsedMinutes,delayed:elapsedMinutes>targetMinutes};
}
