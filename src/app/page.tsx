import {hubMetadata} from '@/lib/hub-metadata';
import { OrderingApp } from '@/components/ordering-app';
import { HubHome } from '@/components/hub-pages';
import { hubEnabled } from '@/lib/hub-config';
export const dynamic = 'force-dynamic';
export function generateMetadata(){return hubEnabled()?{...hubMetadata,title:'Midpoint Hub | FOND, Gym, Padel & Functions',description:'Eat, move, play and get together. Your day, your Midpoint.'}:{};}
export default function Page() {return hubEnabled() ? <HubHome/> : <OrderingApp/>}
