import {cookies} from 'next/headers';
import {HUB_COOKIE} from '@/lib/hub-auth';
import {teamSession} from '@/lib/team';
import {teamRecoveryStatus,beginRecoveryEmail,completeRecoveryEmail} from '@/lib/team-recovery';
import {validRequestOrigin} from '@/lib/request-origin';
const headers={'Cache-Control':'no-store'};
async function member(){return teamSession((await cookies()).get(HUB_COOKIE)?.value);}
export async function GET(){const m=await member();return m?Response.json(teamRecoveryStatus(m.id),{headers}):Response.json({message:'Sign in with your named team account.'},{status:401,headers});}
export async function POST(request:Request){
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 const m=await member();if(!m)return Response.json({message:'Sign in required.'},{status:401,headers});
 const b=await request.json().catch(()=>null);
 if(typeof b?.email!=='string'||b.email.length>254||typeof b.password!=='string'||b.password.length>128||(b.twoFactorCode!==undefined&&(typeof b.twoFactorCode!=='string'||b.twoFactorCode.length>64)))return Response.json({message:'Enter a recovery email and your current password.'},{status:400,headers});
 try{return Response.json(await beginRecoveryEmail(m.id,b),{headers});}catch(e){return Response.json({message:e instanceof Error?e.message:'Recovery unavailable.'},{status:400,headers});}
}
export async function PATCH(request:Request){
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 const m=await member();if(!m)return Response.json({message:'Sign in required.'},{status:401,headers});
 const b=await request.json().catch(()=>null);
 if(typeof b?.challenge!=='string'||!/^[a-f0-9]{64}$/.test(b.challenge)||typeof b.code!=='string'||!/^\d{6}$/.test(b.code))return Response.json({message:'Enter your email verification code.'},{status:400,headers});
 try{completeRecoveryEmail(m.id,b.challenge,b.code);return Response.json({message:'Recovery email verified. Sign in again to continue.'},{headers});}catch(e){return Response.json({message:e instanceof Error?e.message:'Recovery unavailable.'},{status:400,headers});}
}
