import Link from 'next/link';
import {HubShell,HubBack} from '@/components/hub-pages';
export const metadata={title:'Car Wash | Midpoint Hub'};
export default function CarWash(){return <HubShell wide mood="home"><HubBack href="/hub">Home</HubBack><section className="hub-all-events"><h1>Car Wash</h1><p>Wash while you work.</p><p>Contact the Midpoint team for car wash availability, services and pricing.</p><Link href="https://www.mid-point.co.za/#Contact">Enquire with Midpoint →</Link></section></HubShell>;}
