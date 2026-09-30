import {cookies} from 'next/headers';
import {currentAdmin} from './admin-request';
import {teamSession} from './team';
import {HUB_COOKIE} from './hub-auth';
export async function functionActor(){const admin=await currentAdmin();if(admin&&['owner','super-admin'].includes(admin.role??''))return admin.actor;const member=teamSession((await cookies()).get(HUB_COOKIE)?.value);return member&&['functions','owner','super-admin'].includes(member.role)?`team:${member.id}`:null;}
