import {redirect} from 'next/navigation';
import {functionActor} from '@/lib/function-auth';
import {HubShell,HubBack} from '@/components/hub-pages';
import {FunctionsManager} from '@/components/functions-manager';
import {hubMetadata} from '@/lib/hub-metadata';
export const metadata={...hubMetadata,title:'Functions calendar | Midpoint Hub'};
export default async function Page(){if(!await functionActor())redirect('/admin?next=/hub/functions');return <HubShell><HubBack href="/admin">Team workspace</HubBack><FunctionsManager/></HubShell>}
