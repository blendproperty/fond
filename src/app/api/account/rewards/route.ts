import {cookies} from 'next/headers';
import {after} from 'next/server';
import {SESSION_COOKIE,resolveSession} from '@/lib/auth';
import {customerRewards,saveRewardPreferences,quoteReward,sendCustomerReward} from '@/lib/loyalty';
import {customerCheckoutMode} from '@/lib/payments';
import {getAvailableMenu} from '@/lib/menu-store';
import {validRequestOrigin} from '@/lib/request-origin';
import {processRewardMessages} from '@/lib/loyalty-messages';
const headers={'Cache-Control':'no-store'};
async function user(){return resolveSession((await cookies()).get(SESSION_COOKIE)?.value);}
export async function GET(){const u=await user();if(!u)return Response.json({message:'Sign in to see rewards.'},{status:401,headers});if(!u.emailVerified)return Response.json({verified:false},{headers});after(processRewardMessages);return Response.json({verified:true,...customerRewards(u.id,customerCheckoutMode()==='live'?'live':'test')},{headers});}
export async function POST(request:Request){const u=await user();if(!u?.emailVerified)return Response.json({message:'Sign in and verify your email to use rewards.'},{status:401,headers});if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});const b=await request.json().catch(()=>null);try{if(b?.action==='send'){sendCustomerReward(u.id,String(b.rewardId??''));after(processRewardMessages);return Response.json({ok:true},{headers});}if(b?.action==='preferences'){saveRewardPreferences(u.id,{email:b.email===true,sms:b.sms===true,phone:typeof b.phone==='string'?b.phone:''});return Response.json({ok:true},{headers});}if(b?.action!=='quote'||typeof b.code!=='string'||b.code.length>40||!Array.isArray(b.lines))throw new Error('Enter a coffee reward code and basket.');const q=quoteReward(u.id,customerCheckoutMode()==='live'?'live':'test',b.code,b.lines,getAvailableMenu());return Response.json({discountCents:q.discountCents,totalCents:q.totalCents},{headers});}catch(e){return Response.json({message:e instanceof Error?e.message:'Could not update rewards.'},{status:400,headers});}}
