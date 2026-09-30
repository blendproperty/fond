import {hubDb} from '@/lib/hub-store';
import {hubActor} from '@/lib/hub-auth';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404});
  const db=hubDb(),row=db.prepare('SELECT service,bytes FROM hub_event_images WHERE id=?').get(id) as {service:'gym'|'padel';bytes:Uint8Array}|undefined;
  if(!row)return new Response(null,{status:404});
  const published=db.prepare('SELECT id FROM hub_events WHERE image_id=? AND published=1').get(id);
  if(!published){const who=await hubActor();if(!who?.services.includes(row.service))return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});}
  return new Response(new Uint8Array(row.bytes),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
}
