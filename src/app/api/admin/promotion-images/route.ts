import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { ADMIN_COOKIE,isValidAdminToken } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';
export async function POST(request:Request){
 if(!isValidAdminToken((await cookies()).get(ADMIN_COOKIE)?.value))return Response.json({message:'Admin access required.'},{status:401});
 if(Number(request.headers.get('content-length'))>2200000)return Response.json({message:'Use an image smaller than 2 MB.'},{status:413});
 try{
 const reader=request.body?.getReader();if(!reader)throw new Error('Choose an image.');const chunks:Uint8Array[]=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>2200000){await reader.cancel();throw new Error('Use an image smaller than 2 MB.');}chunks.push(value);}
 const data=await new Response(new Uint8Array(Buffer.concat(chunks)),{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData(),file=data.get('image');if(!(file instanceof File)||file.size>2000000||!file.size)throw new Error('Choose a JPG, PNG or WebP image under 2 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());let mime='';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
 else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';
 else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')mime='image/webp';
 if(!mime)throw new Error('Only JPG, PNG and WebP images are supported.');
 const db=getDb();if(Number(db.prepare('SELECT count(*) AS n FROM promotion_images').get()?.n)>=200)throw new Error('Image library is full. Contact the administrator to archive unused images.');
 const id=randomUUID();db.prepare('INSERT INTO promotion_images VALUES (?,?,?,?)').run(id,mime,bytes,new Date().toISOString());return Response.json({url:'/api/promotion-images/'+id},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Upload failed.'},{status:400});}
}
