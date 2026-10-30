import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {teamSession} from '@/lib/team';
import {validRequestOrigin} from '@/lib/request-origin';
import {adminCoupons,couponRecipients,issueCoupons,revokeCoupon,saveCouponSettings} from '@/lib/coupons';
const headers={'Cache-Control':'no-store'};
async function actor(){const token=(await cookies()).get(ADMIN_COOKIE)?.value;return adminRole(token)==='super-admin'?`admin:${teamSession(token)?.id??'shared'}`:null;}
export async function GET(request:Request){
 if(!await actor())return Response.json({message:'Super admin access required.'},{status:403,headers});
 const query=new URL(request.url).searchParams.get('recipients');
 try{return Response.json(query===null?adminCoupons():couponRecipients(query),{headers});}
 catch(e){return Response.json({message:e instanceof Error?e.message:'Could not search customers.'},{status:400,headers});}
}
export async function POST(request:Request){
 const who=await actor();if(!who)return Response.json({message:'Super admin access required.'},{status:403,headers});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 try{const b=await request.json();
  if(b?.action==='settings')return Response.json({settings:saveCouponSettings({enabled:b.enabled,days:b.days,percent:b.percent,amountCents:b.amountCents,validDays:b.validDays},who)},{headers});
  if(b?.action==='issue')return Response.json({rewards:issueCoupons({...b,requestKey:request.headers.get('Idempotency-Key')??''},who)},{headers});
  if(b?.action==='revoke'){revokeCoupon(String(b.id??''),who);return Response.json({ok:true},{headers});}
  throw new Error('Choose a valid coupon action.');
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Could not update coupons.'},{status:400,headers});}
}
