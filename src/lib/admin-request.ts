import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminRole,isValidAdminToken} from './admin-auth';
import {teamSession} from './team';

export async function currentAdmin(){
  const token=(await cookies()).get(ADMIN_COOKIE)?.value;
  if(!isValidAdminToken(token))return null;
  const member=teamSession(token);
  return {actor:member?`team:${member.id}`:'shared-admin',role:adminRole(token)};
}
