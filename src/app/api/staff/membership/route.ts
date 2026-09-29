import {cookies} from 'next/headers';
import {STAFF_COOKIE,isValidStaffToken} from '@/lib/staff-auth';
import {validRequestOrigin} from '@/lib/request-origin';
import {lookupMembership} from '@/lib/counter-order';
export async function POST(request:Request){
 if(!isValidStaffToken((await cookies()).get(STAFF_COOKIE)?.value))return Response.json({message:'Staff sign-in required.'},{status:401});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403});
 try{const b=await request.json();if(typeof b.code!=='string'||b.code.length>40)throw new Error('Enter the membership number.');return Response.json(lookupMembership(b.code),{headers:{'Cache-Control':'no-store'}});}catch(e){return Response.json({message:e instanceof Error?e.message:'Membership unavailable.'},{status:400});}
}
