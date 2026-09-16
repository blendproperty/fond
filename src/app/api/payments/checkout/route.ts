import { createCustomerCheckout } from '@/lib/payments';
export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  if(typeof body?.reference!=='string'||!/^FOND-[A-F0-9]{32}$/.test(body.reference))return Response.json({message:'Provide a valid order reference.'},{status:400});
  try{return Response.json({redirectUrl:await createCustomerCheckout(body.reference)},{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({message:e instanceof Error?e.message:'Checkout unavailable.'},{status:400});}
}
