import { getDb } from '@/lib/db';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response(null,{status:404});
 const image=getDb().prepare('SELECT mime,bytes FROM promotion_images WHERE id=?').get(id) as {mime:string;bytes:Uint8Array}|undefined;if(!image)return new Response(null,{status:404});
 return new Response(new Uint8Array(image.bytes),{headers:{'Content-Type':image.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=86400','Content-Security-Policy':"default-src 'none'"}});
}
