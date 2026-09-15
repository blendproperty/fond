import { verifyYocoSignature,processPaymentEvent } from '@/lib/payments';
export async function POST(request:Request){
  const raw=await request.text();
  if(raw.length>1000000||!verifyYocoSignature(raw,request.headers))return Response.json({message:'Invalid signature.'},{status:401});
  try{return Response.json(processPaymentEvent(JSON.parse(raw)));}catch{return Response.json({message:'Payment reconciliation failed.'},{status:409});}
}
