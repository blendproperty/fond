import { cookies } from 'next/headers';
import { teamSession } from './team';
import { currentAdmin } from './admin-request';
import type { HubService } from './hub-config';
export const HUB_COOKIE = 'midpoint_hub_team';
export async function hubActor() {
  const admin = await currentAdmin();
  if (admin && ['super-admin','owner'].includes(admin.role ?? '')) return {actor:admin.actor, services:['gym','padel'] as HubService[]};
  const member = teamSession((await cookies()).get(HUB_COOKIE)?.value);
  if (!member) return null;
  const services: HubService[] = member.role === 'gym' ? ['gym'] : member.role === 'padel' ? ['padel'] : ['owner','super-admin'].includes(member.role) ? ['gym','padel'] : [];
  return services.length ? {actor:`team:${member.id}`,services} : null;
}
