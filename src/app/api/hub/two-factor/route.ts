import { cookies } from 'next/headers';
import { HUB_COOKIE } from '@/lib/hub-auth';
import { teamSession, loginAllowed, recordLoginFailure, clearLoginFailures } from '@/lib/team';
import { activateTwoFactor, beginTwoFactor, disableTwoFactor, twoFactorActive } from '@/lib/two-factor';
import { validRequestOrigin } from '@/lib/request-origin';
const headers={'Cache-Control':'no-store'};
async function member(){const m=teamSession((await cookies()).get(HUB_COOKIE)?.value);return m&&['gym','padel','functions','manager','owner','super-admin'].includes(m.role)?m:null;}
export async function GET(){const m=await member();return m?Response.json({active:twoFactorActive(m.id)},{headers}):Response.json({message:'Sign in with your named Hub account.'},{status:403,headers});}
export async function POST(request:Request){
  const m=await member();if(!m)return Response.json({message:'Sign in required.'},{status:403,headers});
  if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
  const b=await request.json().catch(()=>null);
  if(b?.action==='disable'&&typeof b.code==='string'&&b.code.length<=64){
    const key=`2fa-disable:${m.id}`;
    if(!loginAllowed(key))return Response.json({message:'Too many attempts. Try again in 15 minutes.'},{status:429,headers});
    try{disableTwoFactor(m.id,b.code);clearLoginFailures(key);return Response.json({active:false,signInRequired:true},{headers});}
    catch{recordLoginFailure(key);return Response.json({message:'Enter a valid authenticator or recovery code to turn off 2FA.'},{status:400,headers});}
  }
  try{if(b?.action==='begin')return Response.json(beginTwoFactor(m.id,m.username),{headers});if(b?.action==='activate'&&typeof b.code==='string')return Response.json({active:true,recoveryCodes:activateTwoFactor(m.id,b.code)},{headers});return Response.json({message:'Choose a valid action.'},{status:400,headers});}
  catch{return Response.json({message:'Unable to enable authenticator. Check your current code and try again.'},{status:400,headers});}
}
