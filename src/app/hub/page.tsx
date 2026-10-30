import {hubMetadata} from '@/lib/hub-metadata';
import {publicPageMetadata} from '@/lib/public-page-metadata';
import { HubHome } from '@/components/hub-pages';
export async function generateMetadata(){return {...hubMetadata,...await publicPageMetadata('/','Midpoint Hub | FOND, Gym, Padel & Functions','Eat, move, play and get together. Your day, your Midpoint.')};}
export default HubHome;
