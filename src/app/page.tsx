import { OrderingApp } from '@/components/ordering-app';
import { HubHome } from '@/components/hub-pages';
import { hubEnabled } from '@/lib/hub-config';
export const dynamic = 'force-dynamic';
export function generateMetadata(){return hubEnabled()?{title:'Midpoint Hub | FOND, Gym & Padel',description:'Your coffee, your next class, your time on court. All at Midpoint.'}:{};}
export default function Page() {return hubEnabled() ? <HubHome/> : <OrderingApp/>}
