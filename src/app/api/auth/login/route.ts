import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import {beginCustomerLogin,completeCustomerLogin} from '@/lib/customer-security';
import {validRequestOrigin} from '@/lib/request-origin';
import {setCustomerCookie} from '@/lib/customer-security-response';
const headers={'Cache-Control':'no-store'};

export async function POST(request: Request) {
  if(!validRequestOrigin(request))return NextResponse.json({message:'Invalid origin.'},{status:403,headers});
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ code: 'INVALID_INPUT', message: 'Email and password are required.' }, { status: 400 });
  }
  try {
    const {token,...data}=await beginCustomerLogin(body.email,body.password);
    const response=NextResponse.json(data,{headers});
    if(token)setCustomerCookie(response,token);
    return response;
  } catch (error) {
    return NextResponse.json({message:error instanceof AuthError?error.message:'Sign-in is temporarily unavailable.'},{status:401,headers});
  }
}

export async function PATCH(request:Request){
 if(!validRequestOrigin(request))return NextResponse.json({message:'Invalid origin.'},{status:403,headers});
 const body=await request.json().catch(()=>null);
 if(typeof body?.challenge!=='string'||body.challenge.length!==64||typeof body?.code!=='string'||body.code.length>32)return NextResponse.json({message:'Enter your sign-in code.'},{status:400,headers});
 try{const result=completeCustomerLogin(body.challenge,body.code);const response=NextResponse.json({user:result.user},{headers});setCustomerCookie(response,result.token);return response;}
 catch(e){return NextResponse.json({message:e instanceof AuthError?e.message:'Could not verify your code.'},{status:400,headers});}
}
