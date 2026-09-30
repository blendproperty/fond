import {hubActor} from '@/lib/hub-auth';
import {validRequestOrigin} from '@/lib/request-origin';
import {serviceOf,HubError} from '@/lib/hub-store';
import {saveEventImage} from '@/lib/hub-event-images';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
  const who=await hubActor();if(!who)return Response.json({message:'Sign in required.'},{status:401,headers});
  if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
  try{
    const service=serviceOf(new URL(request.url).searchParams.get('service'));
    if(!who.services.includes(service))return Response.json({message:'Access denied.'},{status:403,headers});
    const reader=request.body?.getReader();if(!reader)throw new HubError('Choose an image.');
    const chunks:Uint8Array[]=[];let length=0;
    while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>5_200_000){await reader.cancel();return Response.json({message:'Choose an image under 5 MB.'},{status:413,headers});}chunks.push(value);}
    const data=await new Response(new Uint8Array(Buffer.concat(chunks)),{headers:{'Content-Type':request.headers.get('content-type')??''}}).formData();
    const file=data.get('image');if(!(file instanceof File))throw new HubError('Choose an image.');
    const url=await saveEventImage(service,Buffer.from(await file.arrayBuffer()),who.actor);
    return Response.json({url},{status:201,headers});
  }catch(e){return Response.json({message:e instanceof HubError?e.message:'Unable to upload. Please try again.'},{status:400,headers});}
}
