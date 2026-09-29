import { HubShell, HubBack } from '@/components/hub-pages';
import { HubManager } from '@/components/hub-manager';
export const metadata={title:'Team workspace | Midpoint Hub'};
export default function Page(){return <HubShell><HubBack href="/hub">Midpoint Hub</HubBack><HubManager/></HubShell>;}
