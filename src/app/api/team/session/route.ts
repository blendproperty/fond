import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {loginMember,loginAllowed,recordLoginFailure,clearLoginFailures,revokeSession} from '@/lib/team';
import {teamIdentity,teamAreas} from '@/lib/team-access';
import {ADMIN_COOKIE} from '@/lib/admin-auth';
import {HUB_COOKIE} from '@/lib/hub-auth';
import {STAFF_COOKIE} from '@/lib/staff-auth';
import {validRequestOrigin} from '@/lib/request-origin';
const headers={'Cache-Control':'no-store'};
export async function GET(){const identity=await teamIdentity();return NextResponse.json(identity??{message:'Sign in required.'},{status:identity?200:401,headers});}
export async function POST(request:Request){
 if(!validRequestOrigin(request))return NextResponse.json({message:'Invalid origin.'},{status:403,headers});
 const b=await request.json().catch(()=>null);
 if(typeof b?.username!=='string'||typeof b.password!=='string'||b.username.length>100||b.password.length>128)return NextResponse.json({message:'Enter your team username and password.'},{status:400,headers});
 const key='team-'+b.username.trim().toLowerCase();if(!loginAllowed(key))return NextResponse.json({message:'Too many attempts. Try again in 15 minutes.'},{status:429,headers});
 const member=loginMember(b.username,b.password,typeof b.twoFactorCode==='string'?b.twoFactorCode:undefined);
 if(!member){recordLoginFailure(key);return NextResponse.json({message:'Check your username, password and authenticator code.'},{status:401,headers});}
 clearLoginFailures(key);const areas=teamAreas(member.role),response=NextResponse.json({ok:true,areas},{headers});
 const old=await cookies();for(const key of [ADMIN_COOKIE,HUB_COOKIE,STAFF_COOKIE]){revokeSession(old.get(key)?.value);response.cookies.delete(key);}
 const options={httpOnly:true,sameSite:'lax' as const,secure:process.env.NODE_ENV==='production',path:'/',maxAge:12*3600};
 response.cookies.set(HUB_COOKIE,member.token,options);
 if(areas.fond)response.cookies.set(ADMIN_COOKIE,member.token,options);
 if(areas.staff)response.cookies.set(STAFF_COOKIE,member.token,options);
 return response;
}
export async function DELETE(request:Request){if(!validRequestOrigin(request))return NextResponse.json({message:'Invalid origin.'},{status:403,headers});const c=await cookies(),r=NextResponse.json({ok:true},{headers});for(const key of [ADMIN_COOKIE,HUB_COOKIE,STAFF_COOKIE]){revokeSession(c.get(key)?.value);r.cookies.delete(key);}return r;}
