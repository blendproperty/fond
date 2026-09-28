import {cookies} from 'next/headers';
import {STAFF_COOKIE,isValidStaffToken} from '@/lib/staff-auth';
import {validRequestOrigin} from '@/lib/request-origin';
import {quoteCounterReward} from '@/lib/loyalty';
import {customerCheckoutMode} from '@/lib/payments';
import {getAvailableMenu} from '@/lib/menu-store';
const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
 if(!isValidStaffToken((await cookies()).get(STAFF_COOKIE)?.value))return Response.json({message:'Staff sign-in required.'},{status:401,headers});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 try{
  const b=await request.json();if(typeof b.code!=='string'||!Array.isArray(b.lines))throw new Error('Choose the coffee and enter its reward code.');
  const environment=customerCheckoutMode()==='live'?'live':'test';
  const q=quoteCounterReward(environment,b.code,b.lines,getAvailableMenu());
  return Response.json({discountCents:q.discountCents,totalCents:q.totalCents,environment},{headers});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Could not validate code.'},{status:400,headers});}
}
