import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {teamSession} from '@/lib/team';
import {validRequestOrigin} from '@/lib/request-origin';
import {adminCoupons,couponRecipients,issueCoupons,revokeCoupon,saveCouponSettings,reviewCouponCandidate,issueApprovedCoupon} from '@/lib/coupons';
import {sendCouponEmail,checkCouponEmail} from '@/lib/coupon-delivery';
import {emailConfigured} from '@/lib/email';
const headers={'Cache-Control':'no-store'};
async function actor(){const token=(await cookies()).get(ADMIN_COOKIE)?.value,role=adminRole(token);return role?{name:`admin:${teamSession(token)?.id??'shared'}`,canConfigure:role==='super-admin'||role==='owner'}:null;}
export async function GET(request:Request){
 const who=await actor();if(!who)return Response.json({message:'Manager access required.'},{status:403,headers});
 const query=new URL(request.url).searchParams.get('recipients');
 try{return Response.json(query===null?{...adminCoupons(),canConfigure:who.canConfigure}:couponRecipients(query),{headers});}
 catch(e){return Response.json({message:e instanceof Error?e.message:'Could not search customers.'},{status:400,headers});}
}
export async function POST(request:Request){
 const identity=await actor();if(!identity)return Response.json({message:'Manager access required.'},{status:403,headers});const who=identity.name;
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 try{const b=await request.json();
  if(b?.action==='settings'){
   if(!identity.canConfigure)return Response.json({message:'Owner or super admin access required to change automation settings.'},{status:403,headers});
   return Response.json({settings:saveCouponSettings({enabled:b.enabled,days:b.days,percent:b.percent,amountCents:b.amountCents,validDays:b.validDays},who)},{headers});
  }
  if(b?.action==='approve'||b?.action==='reject'){reviewCouponCandidate(String(b.id??''),b.action==='approve'?'approved':'rejected',who);return Response.json({ok:true},{headers});}
  if(b?.action==='push'){
   if(!emailConfigured())throw new Error('Email provider is not configured. No coupon was issued.');
   const reward=issueApprovedCoupon(String(b.id??''),who);return Response.json({reward,delivery:await sendCouponEmail(reward.id,who)},{headers});
  }
  if(b?.action==='send-email')return Response.json({delivery:await sendCouponEmail(String(b.id??''),who)},{headers});
  if(b?.action==='check-email')return Response.json({delivery:await checkCouponEmail(String(b.id??''))},{headers});
  if(b?.action==='issue'){
   if(b.emailEnabled!==undefined&&typeof b.emailEnabled!=='boolean')throw new Error('Choose whether to email these coupons.');
   if(b.emailEnabled&&!emailConfigured())throw new Error('Email provider is not configured. No coupons were created.');
   const rewards=issueCoupons({...b,requestKey:request.headers.get('Idempotency-Key')??''},who),deliveries=[];
   if(b.emailEnabled)for(const reward of rewards){try{deliveries.push({id:reward.id,...await sendCouponEmail(reward.id,who)});}catch(e){deliveries.push({id:reward.id,status:'unconfirmed',error:e instanceof Error?e.message:'Check delivery before retrying'});}}
   return Response.json({rewards,deliveries},{headers});
  }
  if(b?.action==='revoke'){revokeCoupon(String(b.id??''),who);return Response.json({ok:true},{headers});}
  throw new Error('Choose a valid coupon action.');
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Could not update coupons.'},{status:400,headers});}
}
