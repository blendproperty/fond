import {createHmac,timingSafeEqual} from 'node:crypto';
import {providerSecret} from '@/lib/provider-secrets';

const noStore={'Cache-Control':'no-store'};
function same(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}

export async function GET(request:Request){
 const url=new URL(request.url),mode=url.searchParams.get('hub.mode')??'',token=url.searchParams.get('hub.verify_token')??'',challenge=url.searchParams.get('hub.challenge')??'';
 const expected=providerSecret('meta-webhook-verify')??process.env.FOND_WHATSAPP_VERIFY_TOKEN??'';
 if(mode!=='subscribe'||!expected||!challenge||!same(token,expected))return new Response('Forbidden',{status:403,headers:noStore});
 return new Response(challenge,{status:200,headers:{...noStore,'Content-Type':'text/plain'}});
}

export async function POST(request:Request){
 const raw=await request.text(),signature=request.headers.get('x-hub-signature-256')??'',secret=providerSecret('meta-app-secret')??process.env.FOND_WHATSAPP_APP_SECRET??'';
 if(!secret)return new Response('Not configured',{status:503,headers:noStore});
 const expected='sha256='+createHmac('sha256',secret).update(raw).digest('hex');
 if(!same(signature,expected))return new Response('Invalid signature',{status:401,headers:noStore});
 return Response.json({ok:true},{headers:noStore});
}
