import { getDb } from './db';
import { getFullMenu } from './menu-store';
const DAY=86400000;
export function saDate(now=new Date()){return new Date(now.getTime()+2*3600000).toISOString().slice(0,10);}
function date(value:string){const n=Date.parse(value+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw new Error('Choose valid dates.');return n;}
type Row={created_at:string;status:string;total_cents:number;fulfillment:string;lines_json:string};
export function analytics(from:string,to:string,fulfillment='all'){
 const start=date(from),end=date(to),days=(end-start)/DAY+1;
 if(days<1||days>366||!['all','collection','delivery'].includes(fulfillment))throw new Error('Choose a range of 1–366 days and a valid fulfilment filter.');
 const previousFrom=new Date(start-days*DAY).toISOString().slice(0,10),previousTo=new Date(start-DAY).toISOString().slice(0,10);
 const rows=getDb().prepare("SELECT created_at,status,total_cents,fulfillment,lines_json FROM orders WHERE date(created_at,'+2 hours') BETWEEN ? AND ? AND (?='all' OR fulfillment=?)").all(previousFrom,to,fulfillment,fulfillment) as Row[];
 const menu=getFullMenu(),catalogue=new Map(menu.map(m=>[m.id,m]));
 const current=rows.filter(r=>saDate(new Date(r.created_at))>=from),previous=rows.filter(r=>saDate(new Date(r.created_at))<from);
 const lines=(r:Row):{id:string;name?:string;quantity:number;subtotalCents?:number}[]=>{try{const v=JSON.parse(r.lines_json);return Array.isArray(v)?v:[];}catch{return [];}};
 const summary=(rs:Row[])=>{const completed=rs.filter(r=>r.status==='completed');const value=completed.reduce((n,r)=>n+r.total_cents,0);return {value,orders:completed.length,average:completed.length?Math.round(value/completed.length):0,units:completed.reduce((n,r)=>n+lines(r).reduce((a,l)=>a+l.quantity,0),0)};};
 const daily=Array.from({length:days},(_,i)=>({date:new Date(start+i*DAY).toISOString().slice(0,10),value:0,orders:0,previousValue:0}));
 for(const r of rows.filter(r=>r.status==='completed')){const d=date(saDate(new Date(r.created_at))),old=d<start,index=(d-(old?start-days*DAY:start))/DAY;if(old)daily[index].previousValue+=r.total_cents;else{daily[index].value+=r.total_cents;daily[index].orders++;}}
 const products=new Map<string,{id:string;name:string;category:string;units:number;value:number;unpricedUnits:number}>();
 const hours=Array.from({length:24},(_,hour)=>({hour,orders:0}));
 for(const r of current.filter(r=>r.status==='completed')){
  hours[new Date(Date.parse(r.created_at)+7200000).getUTCHours()].orders++;
  for(const l of lines(r)){const item=catalogue.get(l.id);const p=products.get(l.id)??{id:l.id,name:l.name??item?.name??l.id,category:item?.category??'Archived / uncategorised',units:0,value:0,unpricedUnits:0};p.units+=l.quantity;if(Number.isSafeInteger(l.subtotalCents)&&l.subtotalCents!>=0)p.value+=l.subtotalCents!;else p.unpricedUnits+=l.quantity;products.set(l.id,p);}
 }
 const ranked=[...products.values()].sort((a,b)=>b.units-a.units||a.name.localeCompare(b.name));
 const groups=new Map<string,{name:string;units:number;value:number}>();for(const p of ranked){const c=groups.get(p.category)??{name:p.category,units:0,value:0};c.units+=p.units;c.value+=p.value;groups.set(c.name,c);}
 return {from,to,previousFrom,previousTo,fulfillment,generatedAt:new Date().toISOString(),summary:summary(current),previous:summary(previous),daily,hours,products:ranked,categories:[...groups.values()].sort((a,b)=>b.units-a.units),status:['received','accepted','ready','completed','cancelled'].map(status=>({name:status,orders:current.filter(r=>r.status===status).length})),mix:['collection','delivery'].map(name=>({name,orders:current.filter(r=>r.status==='completed'&&r.fulfillment===name).length})),noSalesCount:menu.filter(m=>m.available!==false&&!products.has(m.id)).length,unpricedUnits:ranked.reduce((n,p)=>n+p.unpricedUnits,0)};
}
export type Analytics=ReturnType<typeof analytics>;
