import {type NextResponse} from 'next/server';
import {SESSION_COOKIE} from './auth';
export function setCustomerCookie(response:NextResponse,token:string){response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*30});}
