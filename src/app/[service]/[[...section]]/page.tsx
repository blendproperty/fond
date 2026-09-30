import {hubMetadata} from '@/lib/hub-metadata';
import { notFound } from 'next/navigation';
import { HubShell, HubBack, HubLanding } from '@/components/hub-pages';
import { HubSignup } from '@/components/hub-signup';
import { HubCalendarView } from '@/components/hub-calendar';
import { listEvents } from '@/lib/hub-store';
export const dynamic = 'force-dynamic';
type Props = {params:Promise<{service:string;section?:string[]}>};
export async function generateMetadata({params}:Props){const {service}=await params;return {...hubMetadata,title:`Midpoint ${service==='gym'?'Gym':service==='padel'?'Padel':'Hub'}`};}
export default async function Page({params}:Props) {
  const {service,section=[]}=await params; if(service!=='gym'&&service!=='padel')notFound();
  if(!section.length)return <HubLanding service={service}/>;
  let content:React.ReactNode;
  if(section.length===1&&section[0]==='signup')content=<HubSignup service={service}/>;
  else if(section.length===1&&(section[0]==='events'||service==='gym'&&section[0]==='classes'))content=<HubCalendarView service={service} kind={section[0] as 'classes'|'events'} events={listEvents(service)}/>;
  else if(section.length===2&&section[0]==='interest'){const event=listEvents(service).find(e=>e.id===section[1]&&Date.parse(e.endsAt)>Date.now());if(!event)notFound();content=<HubSignup service={service} eventId={event.id} eventTitle={event.title} eventImage={event.imageUrl} eventImageAlt={event.imageAlt}/>;}
  else notFound();
  return <HubShell service={service}><HubBack href={`/${service}`}>Midpoint {service==='gym'?'Gym':'Padel'}</HubBack>{content}</HubShell>;
}
