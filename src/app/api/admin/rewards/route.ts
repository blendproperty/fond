import {cookies} from 'next/headers';
import {after} from 'next/server';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {teamSession} from '@/lib/team';
import {validRequestOrigin} from '@/lib/request-origin';
import {adminRewards,issueGift,revokeGift} from '@/lib/loyalty';
import {customerCheckoutMode} from '@/lib/payments';
import {processRewardMessages} from '@/lib/loyalty-messages';
const headers={'Cache-Control':'no-store'};
async function actor(){const t=(await cookies()).get(ADMIN_COOKIE)?.value;return adminRole(t)==='super-admin'?`admin:${teamSession(t)?.id??'shared'}`:null;}
export async function GET(){if(!await actor())return Response.json({message:'Super admin access required.'},{status:403,headers});return Response.json({environment:customerCheckoutMode()==='live'?'live':'test',...adminRewards()},{headers});}
export async function POST(request:Request){const who=await actor();if(!who)return Response.json({message:'Super admin access required.'},{status:403,headers});if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});try{const b=await request.json();if(b.action==='revoke'){revokeGift(String(b.id??''),who);return Response.json({ok:true},{headers});}if(b.action!=='gift')throw new Error('Choose a valid reward action.');const r=issueGift({email:String(b.email??''),environment:customerCheckoutMode()==='live'?'live':'test',reason:String(b.reason??''),requestKey:request.headers.get('Idempotency-Key')??'',emailEnabled:b.emailEnabled===true,smsEnabled:b.smsEnabled===true,phone:String(b.phone??'')},who);after(processRewardMessages);return Response.json({code:r.code,id:r.id,status:r.status},{headers});}catch(e){return Response.json({message:e instanceof Error?e.message:'Could not issue gift.'},{status:400,headers});}}
