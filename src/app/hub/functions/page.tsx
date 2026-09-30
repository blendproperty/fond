import {HubShell,HubBack} from '@/components/hub-pages';
import {FunctionsManager} from '@/components/functions-manager';
import {hubMetadata} from '@/lib/hub-metadata';
export const metadata={...hubMetadata,title:'Functions calendar | Midpoint Hub'};
export default function Page(){return <HubShell><HubBack href="/hub/manage">Team workspace</HubBack><FunctionsManager/></HubShell>}
