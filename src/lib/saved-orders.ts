export type SavedOrder = {lookup:string;label:string;savedAt:number};
export const SAVED_ORDERS_KEY='fond-recent-orders-v1';
const REFERENCE=/^FOND-(?:[A-F0-9]{32}|[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4})$/;
export function savedOrders(value:unknown,now=Date.now()):SavedOrder[]{
  if(!Array.isArray(value))return [];
  const seen=new Set<string>();
  return value.filter((item):item is SavedOrder=>{
    if(!item||typeof item!=='object'||typeof item.lookup!=='string'||typeof item.label!=='string'||!REFERENCE.test(item.lookup)||!REFERENCE.test(item.label)||!Number.isFinite(item.savedAt)||item.savedAt>now||now-item.savedAt>30*86400000||seen.has(item.lookup))return false;
    seen.add(item.lookup);return true;
  }).slice(0,10).map(({lookup,label,savedAt})=>({lookup,label,savedAt}));
}
