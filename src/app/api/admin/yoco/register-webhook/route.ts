import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole} from '@/lib/admin-auth';
import {teamSession} from '@/lib/team';
import {validRequestOrigin} from '@/lib/request-origin';
import {providerSecretStatus} from '@/lib/provider-secrets';
import {registerYocoWebhook} from '@/lib/payments';

const headers={'Cache-Control':'no-store'};
export async function POST(request:Request){
  const token=(await cookies()).get(ADMIN_COOKIE)?.value;
  if(adminRole(token)!=='super-admin')return Response.json({message:'Super admin access required.'},{status:403,headers});
  if(!validRequestOrigin(request))return Response.json({message:'Invalid origin.'},{status:403,headers});
  if(providerSecretStatus('yoco-webhook'))return Response.json({message:'A Yoco webhook signing secret is already stored.'},{status:409,headers});
  const member=teamSession(token),actor=member?`super:${member.id}`:'shared-admin';
  try{return Response.json(await registerYocoWebhook(actor),{headers});}
  catch(error){return Response.json({message:error instanceof Error?error.message:'Could not register the Yoco webhook.'},{status:400,headers});}
}
