import Link from 'next/link';
import { Coffee, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Dumbbell, MapPin, ShieldCheck, Volleyball, UserRoundPlus } from 'lucide-react';
import { HUB_CONTACTS, type HubService } from '@/lib/hub-config';
import './hub.css';
import { FunctionBookingForm } from './function-booking';
import { HubAppNav } from './hub-app-nav';

export function HubShell({children,service,wide=false}:{children:React.ReactNode;service?:HubService;wide?:boolean}) {
  return <main className={`hub-shell hub-app ${service==='padel'?'hub-padel':''} ${wide?'hub-wide':''}`}>
    <header className="hub-top">
      <Link href="/hub" aria-label="Midpoint Hub home"><img src="/hub-assets/hub-logo-stacked.svg" width="180" height="120" alt="Midpoint Hub"/></Link>
      <nav aria-label="Hub navigation"><Link href="/fond">FOND</Link><Link href="/gym" aria-current={service==='gym'?'page':undefined}>Gym</Link><Link href="/padel" aria-current={service==='padel'?'page':undefined}>Padel</Link><Link href="/functions">Functions</Link></nav>
      <span className="hub-header-place">MIDRAND, SOUTH AFRICA</span>
    </header>
    <div className="hub-content">{children}</div>
    <HubAppNav/>
    <footer className="hub-footer"><div><strong>A little more to your day.</strong><p>162 Tonetti Street, Halfway House, Midrand</p></div><nav aria-label="Footer destinations"><Link href="/fond">FOND</Link><Link href="/gym">Gym</Link><Link href="/padel">Padel</Link><Link href="/functions">Functions</Link></nav><div><Link href="/hub/privacy">Your details</Link><Link href="/hub/manage">Team sign in</Link></div></footer>
  </main>;
}
export function HubBack({href,children}:{href:string;children:React.ReactNode}) {return <Link href={href} className="hub-back"><ArrowLeft size={16}/>{children}</Link>;}
export function HubNote({title,children}:{title:string;children:React.ReactNode}) {return <aside className="hub-note"><ShieldCheck/><div><h3>{title}</h3><p>{children}</p></div></aside>;}
export function HubHome() {
 return <HubShell wide>
  <section className="hub-app-welcome"><span className="hub-eyebrow">YOUR EVERYDAY, CONNECTED</span><h1>Your day.<br/>All at Midpoint.</h1><p>Pick your place. Make it your day.</p></section>
  <nav className="hub-app-destinations" aria-label="Choose a destination">{[
    {href:'/fond',title:'FOND',copy:'Order food & coffee',badge:'fond-corrected.png'},
    {href:'/gym',title:'Gym',copy:'Classes & membership',badge:'gym.png'},
    {href:'/padel',title:'Padel',copy:'Courts & community',badge:'padel.png'},
  ].map(item=><Link href={item.href} key={item.href}><img src={`/hub-assets/original/${item.badge}`} alt=""/><h2>{item.title}</h2><p>{item.copy}</p><span>Let’s go <ArrowUpRight size={16}/></span></Link>)}</nav>
  <section className="hub-app-shortcuts"><h2>What’s the plan?</h2><div><Link href="/fond"><Coffee/><span>Grab a bite<small>Order something good from FOND</small></span><ArrowRight size={17}/></Link><a href="https://playtomic.com/clubs/midpoint-padel" target="_blank" rel="noopener noreferrer"><Volleyball/><span>Book a court<small>Open Midpoint on Playtomic</small></span><ArrowUpRight size={17}/></a><Link href="/functions"><CalendarDays/><span>Get together<small>Plan a function with Michelle</small></span><ArrowRight size={17}/></Link></div></section>
 </HubShell>;
}
export function HubLanding({service}:{service:HubService}) {
  const gym=service==='gym', contact=HUB_CONTACTS[service];
  const actions=gym?[{href:'/gym/signup',label:'Sign up',copy:'Start your membership journey.',icon:UserRoundPlus},{href:'/gym/events',label:'Join an event',copy:'Find your next shared challenge.',icon:CalendarDays},{href:'/gym/classes',label:'Join a class',copy:'Make movement part of your day.',icon:Dumbbell}]:[{href:'/padel/signup',label:'Tenant signup',copy:'Get your Midpoint tenant profile ready.',icon:UserRoundPlus},{href:'https://playtomic.com/clubs/midpoint-padel',label:'Book a court',copy:'Find your next game on Playtomic.',icon:Volleyball},{href:'/padel/events',label:'Join an event',copy:'Meet the community on court.',icon:CalendarDays}];
  return <HubShell service={service} wide>
    <HubBack href="/hub">Midpoint Hub</HubBack>
    <section className="hub-service-hero"><div className="hub-landing"><span className="hub-eyebrow">MIDPOINT {service.toUpperCase()}</span><h1>{gym?<>Make time<br/>for your strength.</>:<>A better way<br/>to end your day.</>}</h1><p>{gym?'A great workout, a fresh start. Right here on the estate.':'Good rallies. Great company. Your next game starts here.'}</p><a href="#your-next-move" className="hub-explore">{gym?'Find your next move':'Let’s get you playing'} <ArrowRight size={20}/></a></div><div className="hub-service-emblem"><img src={`/hub-assets/original/${service}.png`} alt={`Midpoint ${gym?'Gym':'Padel'}`}/></div></section>
    <section className="hub-next" id="your-next-move"><div className="hub-section-heading"><span className="hub-eyebrow">YOUR NEXT MOVE</span><h2>{gym?'Good habits start here.':'See you on the court.'}</h2></div><nav className="hub-actions" aria-label={`${service} actions`}>{actions.map((a,index)=><a href={a.href} key={a.label} aria-label={`Midpoint ${gym?'Gym':'Padel'} ${a.label}`} {...(a.href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{gym?<span className="hub-action-art hub-original-action" style={{'--badge-position':index===0?'0%':index===1?'50%':'100%'} as React.CSSProperties} aria-hidden="true"/>:<span className="hub-action-art hub-original-padel" aria-hidden="true"><img src="/hub-assets/original/padel.png" alt=""/></span>}<b>{a.label} <ArrowUpRight size={19}/></b><p>{a.copy}</p></a>)}</nav></section>
    <section className="hub-service-bottom"><HubNote title={gym?'Your membership starts here':'A Midpoint tenant? Let’s get you playing.'}>{gym?'Send us your details, then visit the gym. Our team will complete your Itensity registration, finalise payment and set up your gym access.':'Request your tenant setup. Our team will verify your details and help get your Playtomic profile ready. Court bookings are confirmed separately.'}</HubNote><div className="hub-service-contact"><span className="hub-eyebrow">LET’S GET YOU STARTED</span><h2>Talk to {contact.name}.</h2><a href={`mailto:${contact.email}`}>{contact.email} <ArrowUpRight size={18}/></a><p className="hub-provider">{gym?'Membership & gym access':'Court bookings'} <strong>{gym?'Itensity':'Playtomic'}</strong></p></div></section>
  </HubShell>;
}
export function HubFunctions(){return <HubShell wide><HubBack href="/hub">Midpoint Hub</HubBack><section className="hub-app-function-heading"><span className="hub-app-function-icon"><CalendarDays size={34}/></span><span className="hub-eyebrow">BETTER TOGETHER</span><h1>Make it<br/>an occasion.</h1><p>Your people. Your plans. Let’s find your date.</p></section><FunctionBookingForm/></HubShell>;}
