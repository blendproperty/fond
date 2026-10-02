import {HubComingPage} from '@/components/hub-coming-page';
import {hubMetadata} from '@/lib/hub-metadata';
export const metadata={...hubMetadata,title:'Car Wash | Midpoint Hub'};
export const dynamic='force-dynamic';
export default function Page(){return <HubComingPage service="car-wash"/>;}
