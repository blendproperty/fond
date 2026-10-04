import {hubMetadata} from '@/lib/hub-metadata';
import { notFound } from 'next/navigation';
import { HubShell, HubBack, HubLanding } from '@/components/hub-pages';
import { HubSignup } from '@/components/hub-signup';
import { HubCalendarView } from '@/components/hub-calendar';
import { GymClasses } from '@/components/gym-classes';
import { listEvents } from '@/lib/hub-store';
import {PadelShell,PadelInformation} from '@/components/padel-pages';
import {GymShell,GymInformation} from '@/components/gym-pages';
export const dynamic = 'force-dynamic';
type Props = {params:Promise<{service:string;section?:string[]}>};
export async function generateMetadata({params}:Props){const {service}=await params;return {...hubMetadata,title:`Midpoint ${service==='gym'?'Gym':service==='padel'?'Padel':'Hub'}`};}
export default async function Page({params}:Props) {
  const {service,section=[]}=await params; if(service!=='gym'&&service!=='padel')notFound();
  if(!section.length)return <HubLanding service={service}/>;
  if(service==='gym'&&section.length===1&&['membership','access','info'].includes(section[0]))return <GymInformation section={section[0] as 'membership'|'access'|'info'}/>;
  if(service==='padel'&&section.length===1&&['prices','info'].includes(section[0]))return <PadelInformation section={section[0] as 'prices'|'info'}/>;
  let content:React.ReactNode;
  if(section.length===1&&section[0]==='signup')content=<HubSignup service={service}/>;
  else if(service==='gym'&&section.length===1&&section[0]==='classes')content=<GymClasses/>;
  else if(section.length===1&&section[0]==='events')content=<HubCalendarView service={service} kind={section[0] as 'classes'|'events'} events={listEvents(service)}/>;
  else if(section.length===2&&section[0]==='interest'){const event=listEvents(service).find(e=>e.id===section[1]&&Date.parse(e.endsAt)>Date.now());if(!event)notFound();content=<HubSignup service={service} eventId={event.id} eventTitle={event.title} eventImage={event.imageUrl} eventImageAlt={event.imageAlt} eventSummary={<><p>{new Date(event.startsAt).toLocaleString('en-ZA',{dateStyle:'long',timeStyle:'short',timeZone:'Africa/Johannesburg'})} – {new Date(event.endsAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Johannesburg'})} · South African time</p><p>{event.location}</p><p>{event.description}</p><p>Sending interest does not reserve a place.</p></>}/>;}
  else notFound();
  if(service==='gym')return <GymShell><div className="gym-inner-content">{content}</div></GymShell>;
  return <PadelShell><div className="gym-inner-content">{content}</div></PadelShell>;
}
