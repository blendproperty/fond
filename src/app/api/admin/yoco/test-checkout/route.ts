import {cookies} from 'next/headers';
import {randomUUID} from 'node:crypto';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {validRequestOrigin} from '@/lib/request-origin';
import {settings} from '@/lib/management';
import {createOrder} from '@/lib/orders';
import {createCheckout,yocoCredentialMode} from '@/lib/payments';
import {getAvailableMenu} from '@/lib/menu-store';

export async function POST(request:Request){
 const token=(await cookies()).get(ADMIN_COOKIE)?.value;
 if(adminRole(token)!=='super-admin')return Response.json({message:'Super admin access required.'},{status:403});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403});
 const s=settings();
 if(yocoCredentialMode()!=='test')return Response.json({message:'Store a Yoco test secret key first.'},{status:400});
 if(!s.allowTestPayments)return Response.json({message:'Enable Yoco sandbox webhook processing, then save Settings.'},{status:400});
 try{
  const item=getAvailableMenu().filter(item=>item.price>=200).sort((a,b)=>a.price-b.price)[0];
  if(!item)throw new Error('No available menu item meets Yoco\'s minimum checkout amount.');
  const order=createOrder({submissionKey:randomUUID(),customerName:'YOCO SANDBOX TEST',contactNumber:'+27110000000',collectionTime:'Sandbox test — do not prepare',note:'Sandbox payment verification. Do not prepare or enter into POS.',source:'customer',lines:[{id:item.id,quantity:1}]});
  return Response.json({reference:order.reference,amountCents:order.totalCents,redirectUrl:await createCheckout(order.reference,{allowSandbox:true})});
 }catch(error){return Response.json({message:error instanceof Error?error.message:'Could not create Yoco sandbox checkout.'},{status:400});}
}
