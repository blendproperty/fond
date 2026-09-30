import {redirect} from 'next/navigation';
import {hubActor} from '@/lib/hub-auth';
import { HubShell, HubBack } from '@/components/hub-pages';
import { HubManager } from '@/components/hub-manager';
export const metadata={title:'Team workspace | Midpoint Hub'};
export default async function Page(){if(!await hubActor())redirect('/admin?next=/hub/manage');return <HubShell><HubBack href="/admin">Team workspace</HubBack><HubManager/></HubShell>;}
