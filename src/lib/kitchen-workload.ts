import {getDb} from './db';
import {queueDelayForWorkloads} from './preparation-estimates';

type WorkloadRow={status:string;updated_at:string;basket_prep_minutes:number;estimated_prep_minutes:number};

export function currentKitchenDelayMinutes(parallelOrders:number,now=new Date()){
  const rows=getDb().prepare(`
    SELECT o.status,o.updated_at,o.basket_prep_minutes,o.estimated_prep_minutes
    FROM orders o
    WHERE o.status IN ('received','accepted','preparing')
      AND (o.payment_required=0 OR (SELECT coalesce(sum(p.amount_cents),0) FROM payment_records p WHERE p.order_id=o.id)>=o.total_cents)
  `).all() as WorkloadRow[];
  const workloads=rows.map(row=>{
    const basket=Math.max(1,row.basket_prep_minutes??row.estimated_prep_minutes??20);
    if(row.status!=='preparing')return basket;
    const elapsed=Math.max(0,Math.floor((now.getTime()-Date.parse(row.updated_at))/60000));
    return Math.max(0,basket-elapsed);
  });
  return queueDelayForWorkloads(workloads,parallelOrders);
}
