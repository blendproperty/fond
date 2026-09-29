import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {AuthError,SESSION_COOKIE,resolveSession} from '@/lib/auth';
import {beginSecurityChange,completeSecurityChange,customerSecurity} from '@/lib/customer-security';
import {setCustomerCookie} from '@/lib/customer-security-response';
import {validRequestOrigin} from '@/lib/request-origin';
const headers={'Cache-Control':'no-store'};
async function current(){return resolveSession((await cookies()).get(SESSION_COOKIE)?.value);}
export async function GET(){const user=await current();return user?NextResponse.json(customerSecurity(user.id),{headers}):NextResponse.json({message:'Sign in first.'},{status:401,headers});}
async function change(request:Request,confirm:boolean){
 const user=await current();if(!user)return NextResponse.json({message:'Sign in first.'},{status:401,headers});
 if(!validRequestOrigin(request))return NextResponse.json({message:'Invalid origin.'},{status:403,headers});
 const body=await request.json().catch(()=>null);
 if(!body||!['enable','disable'].includes(body.action))return NextResponse.json({message:'Choose a security action.'},{status:400,headers});
 try{
  if(!confirm){if(typeof body.password!=='string'||(body.phone!==undefined&&typeof body.phone!=='string'))throw new AuthError('Enter your current password.');return NextResponse.json(await beginSecurityChange(user,body),{headers});}
  if(typeof body.challenge!=='string'||body.challenge.length!==64||typeof body.code!=='string'||body.code.length>32)throw new AuthError('Enter your security code.');
  const result=completeSecurityChange(user,body.action,body.challenge,body.code);const response=NextResponse.json({security:customerSecurity(user.id),recoveryCodes:result.recoveryCodes},{headers});setCustomerCookie(response,result.token);return response;
 }catch(e){return NextResponse.json({message:e instanceof AuthError?e.message:'Could not update account security. Check your details and try again.'},{status:400,headers});}
}
export async function POST(request:Request){return change(request,false);}
export async function PATCH(request:Request){return change(request,true);}
