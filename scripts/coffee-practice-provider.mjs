import {DatabaseSync} from 'node:sqlite';
if(process.env.FOND_PRACTICE!=='true'||!/[\\/]\.coffee-practice-[^\\/]+[\\/]practice\.sqlite$/.test(process.env.FOND_DB_PATH??''))throw Error('Practice requires its own newly created database.');
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input.url??input.toString());
 if(url.hostname==='api.yocosandbox.com'&&url.pathname.startsWith('/v1/orders/')){
  const db=new DatabaseSync(process.env.FOND_DB_PATH,{readOnly:true});
  try{
   const sales=db.prepare("SELECT * FROM orders WHERE source='staff'").all().map(o=>({id:'practice-'+o.id,order_number:'PRACTICE-'+o.staff_number,status:'completed',currency:'ZAR',created_at:o.created_at,closed_at:new Date().toISOString(),location_id:'practice',note:'FOND '+o.staff_number,amounts:{net_amount:{amount:o.total_cents,currency:'ZAR'},tip_amount:{amount:0,currency:'ZAR'}},payments:[{status:'approved',payment_method:'card',amount_excl_tip:{amount:o.total_cents,currency:'ZAR'}}],line_items:JSON.parse(o.lines_json).map((l,i)=>({id:String(i),variant_id:l.id,name:l.name,quantity:String(l.quantity),net_amount:{amount:l.subtotalCents,currency:'ZAR'}})),refunds:[],returns:[]}));
   if(url.pathname==='/v1/orders/')return Response.json({data:sales,next_cursor:null});
   const sale=sales.find(s=>url.pathname.endsWith(s.id));return sale?Response.json(sale):Response.json({message:'Practice receipt not found'},{status:404});
  }finally{db.close();}
 }
 if(['127.0.0.1','localhost','[::1]'].includes(url.hostname))return realFetch(input,init);
 throw Error('External network calls are disabled in coffee practice.');
};
