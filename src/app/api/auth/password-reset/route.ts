import {after,NextResponse} from 'next/server';
import {AuthError,SESSION_COOKIE} from '@/lib/auth';
import {beginPasswordReset,completePasswordReset} from '@/lib/customer-security';
import {validRequestOrigin} from '@/lib/request-origin';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 if(!validRequestOrigin(request))return NextResponse.json({message:'Invalid origin.'},{status:403,headers});
 const body=await request.json().catch(()=>null);
 if(typeof body?.email!=='string')return NextResponse.json({message:'Enter your account email.'},{status:400,headers});
 try{return NextResponse.json(await beginPasswordReset(body.email,work=>after(work)),{headers});}catch(e){return NextResponse.json({message:e instanceof AuthError?e.message:'Password recovery is temporarily unavailable.'},{status:400,headers});}
}
export async function PATCH(request:Request){
 if(!validRequestOrigin(request))return NextResponse.json({message:'Invalid origin.'},{status:403,headers});
 const body=await request.json().catch(()=>null);
 if(typeof body?.challenge!=='string'||body.challenge.length!==64||typeof body?.code!=='string'||body.code.length>32||typeof body?.password!=='string')return NextResponse.json({message:'Enter your reset code and new password.'},{status:400,headers});
 try{completePasswordReset(body.challenge,body.code,body.password);const response=NextResponse.json({message:'Password updated. Sign in with your new password. Your two-factor setting is unchanged.'},{headers});response.cookies.set(SESSION_COOKIE,'',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0});return response;}
 catch(e){return NextResponse.json({message:e instanceof AuthError?e.message:'Could not reset your password.'},{status:400,headers});}
}
