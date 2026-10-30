import {hubMetadata} from '@/lib/hub-metadata';
import {publicPageMetadata} from '@/lib/public-page-metadata';
import { OrderingApp } from '@/components/ordering-app';
import { HubHome } from '@/components/hub-pages';
import { hubEnabled } from '@/lib/hub-config';
export const dynamic = 'force-dynamic';
export async function generateMetadata(){return hubEnabled()?{...hubMetadata,...await publicPageMetadata('/','Midpoint Hub | FOND, Gym, Padel & Functions','Eat, move, play and get together. Your day, your Midpoint.')}:{};}
export default function Page() {return hubEnabled() ? <HubHome/> : <OrderingApp/>}
