import {cookies} from 'next/headers';
import {after} from 'next/server';
import {STAFF_COOKIE,isValidStaffToken} from '@/lib/staff-auth';
import {teamSession} from '@/lib/team';
import {validRequestOrigin} from '@/lib/request-origin';
import {counterAvailable,previewCounter,awardCounter} from '@/lib/counter-rewards';
import {processRewardMessages} from '@/lib/loyalty-messages';
const headers={'Cache-Control':'no-store'};
async function actor(){const token=(await cookies()).get(STAFF_COOKIE)?.value;return isValidStaffToken(token)?'staff:'+(teamSession(token)?.id??'shared-tablet'):null;}
export async function GET(){if(!await actor())return Response.json({message:'Staff sign-in required.'},{status:401,headers});return Response.json({enabled:counterAvailable()},{headers});}
export async function POST(request:Request){
 const who=await actor();if(!who)return Response.json({message:'Staff sign-in required.'},{status:401,headers});
 if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 try{const b=await request.json();if(typeof b.memberCode!=='string'||b.memberCode.length>40||typeof b.date!=='string'||typeof b.number!=='string')throw new Error('Enter the membership number, Yoco order number and receipt date.');
 if(b.action==='preview')return Response.json(await previewCounter(b),{headers});
 if(b.action!=='award'||typeof b.yocoId!=='string'||!Number.isInteger(b.quantity)||!Number.isInteger(b.revision))throw new Error('Check the receipt before adding stamps.');
 const result=await awardCounter(b,who);after(processRewardMessages);return Response.json(result,{headers});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Could not record counter stamps.'},{status:400,headers});}
}

