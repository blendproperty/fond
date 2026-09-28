import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {teamSession} from '@/lib/team';
import {validRequestOrigin} from '@/lib/request-origin';
import {checkYocoPosConnection,configureYocoPos,validateYocoPosConfig,yocoPosStatus} from '@/lib/yoco-pos';

const headers={'Cache-Control':'no-store'};
async function actor(){const token=(await cookies()).get(ADMIN_COOKIE)?.value;if(adminRole(token)!=='super-admin')return null;const member=teamSession(token);return member?`super:${member.id}`:'shared-admin';}
export async function GET(){
  if(!await actor())return Response.json({message:'Super admin access required.'},{status:403,headers});
  return Response.json(yocoPosStatus(),{headers});
}
export async function POST(request:Request){
  const who=await actor();
  if(!who)return Response.json({message:'Super admin access required.'},{status:403,headers});
  if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
  const body=await request.json().catch(()=>null);
  try {
    if(body?.action==='check'){
      const recent=await checkYocoPosConnection(validateYocoPosConfig(body.config));
      return Response.json({message:'Yoco order access verified. Compare a known EFT receipt with the recent orders below. No orders or payments were changed.',recent},{headers});
    }
    if(body?.action!=='save')throw new Error('Choose a valid action.');
    return Response.json(await configureYocoPos(body.config,who),{headers});
  }catch(error){return Response.json({message:error instanceof Error?error.message:'Could not connect to Yoco.'},{status:400,headers});}
}
