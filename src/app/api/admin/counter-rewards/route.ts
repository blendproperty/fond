import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {teamSession} from '@/lib/team';
import {validRequestOrigin} from '@/lib/request-origin';
import {counterStatus,configureCounter,pauseCounter,rollbackCounter,reverseCounter,inspectCounterReceipt} from '@/lib/counter-rewards';
const headers={'Cache-Control':'no-store'};
async function actor(){const token=(await cookies()).get(ADMIN_COOKIE)?.value;return adminRole(token)==='super-admin'?'admin:'+(teamSession(token)?.id??'shared'):null;}
export async function GET(){if(!await actor())return Response.json({message:'Super admin access required.'},{status:403,headers});return Response.json(counterStatus(),{headers});}
export async function POST(request:Request){const who=await actor();if(!who)return Response.json({message:'Super admin access required.'},{status:403,headers});if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
 try{const b=await request.json();switch(b.action){
 case 'inspect': return Response.json(await inspectCounterReceipt(String(b.date??''),String(b.number??'')),{headers});
 case 'save': return Response.json(await configureCounter(b,who),{headers});
 case 'pause': pauseCounter(who);break;
 case 'reverse': reverseCounter(String(b.id??''),String(b.reason??''),who);break;
 case 'rollback': if(b.confirm!=='ROLL BACK COUNTER')throw new Error('Type ROLL BACK COUNTER to confirm.');return Response.json(rollbackCounter(String(b.reason??''),who),{headers});
 default: throw new Error('Choose a valid counter rewards action.');
 }return Response.json(counterStatus(),{headers});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Could not update counter rewards.'},{status:400,headers});}
}

