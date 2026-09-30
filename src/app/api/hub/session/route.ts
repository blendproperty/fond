import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { HUB_COOKIE } from '@/lib/hub-auth';
import { ADMIN_COOKIE } from '@/lib/admin-auth';
import { loginAllowed, loginMember, recordLoginFailure, clearLoginFailures, revokeSession } from '@/lib/team';
import { validRequestOrigin } from '@/lib/request-origin';
const headers = {'Cache-Control':'no-store'};
export async function POST(request: Request) {
  if (!validRequestOrigin(request)) return NextResponse.json({message:'Invalid origin.'},{status:403,headers});
  const b = await request.json().catch(()=>null);
  if (typeof b?.username !== 'string' || typeof b.password !== 'string' || b.username.length > 100 || b.password.length > 128) return NextResponse.json({message:'Enter your team username and password.'},{status:400,headers});
  const key = `hub-${b.username.trim().toLowerCase()}`;
  if (!loginAllowed(key)) return NextResponse.json({message:'Too many attempts. Try again in 15 minutes.'},{status:429,headers});
  const member = loginMember(b.username,b.password,typeof b.twoFactorCode === 'string' ? b.twoFactorCode : undefined);
  if (!member || !['gym','padel','functions','owner','super-admin'].includes(member.role)) { if(member)revokeSession(member.token);recordLoginFailure(key); return NextResponse.json({message:'Check your sign-in details and Hub access.'},{status:401,headers}); }
  clearLoginFailures(key); const response = NextResponse.json({ok:true},{headers});
  response.cookies.set(HUB_COOKIE,member.token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:12*3600}); return response;
}
export {DELETE} from '@/app/api/team/session/route';
