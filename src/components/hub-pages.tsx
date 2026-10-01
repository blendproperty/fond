import Link from 'next/link';
import { Coffee, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Dumbbell, MapPin, ShieldCheck, Volleyball, UserRoundPlus, UserRound } from 'lucide-react';
import { HUB_CONTACTS, type HubService } from '@/lib/hub-config';
import './hub.css';
import './hub-personality.css';
import { HubScene } from './hub-scene';
import { FunctionBookingForm } from './function-booking';
import { HubAppNav } from './hub-app-nav';
import { InstallApp } from './install-app';
import { listEvents } from '@/lib/hub-store';
import {settings} from '@/lib/management';
import {orderingHoursMessage} from '@/lib/trading-hours';
import {HubFondHours} from './hub-fond-hours';

export function HubShell({children,service,wide=false,mood}:{children:React.ReactNode;service?:HubService;wide?:boolean;mood?:'home'|'functions'}) {
  return <main className={`hub-shell hub-app ${service==='padel'?'hub-padel':''} ${wide?'hub-wide':''} hub-mood-${mood||service||'neutral'}`}>
    <header className="hub-top">
      <Link href="/hub" aria-label="Midpoint Hub home">{mood==='home'?<span className="hub-home-wordmark">MIDPOINT<small>HUB</small></span>:<img src="/hub-assets/hub-logo-stacked.svg" width="180" height="120" alt="Midpoint Hub"/>}</Link>
      <nav aria-label="Hub navigation"><Link href="/fond">FOND</Link><Link href="/gym" aria-current={service==='gym'?'page':undefined}>Gym</Link><Link href="/padel" aria-current={service==='padel'?'page':undefined}>Padel</Link><Link href="/functions">Functions</Link></nav>
      <span className="hub-page-label">{mood==='functions'?'GATHER · FEAST · CELEBRATE':service==='gym'?'MOVE · RESET · REPEAT':service==='padel'?'MEET · PLAY · REPEAT':'A LITTLE MORE TO YOUR DAY'}</span>{mood==='home'&&<Link className="hub-home-account" href="/account" aria-label="My account"><UserRound size={20} strokeWidth={1.6}/></Link>}
    </header>
    <div className="hub-content">{children}</div>
    <HubAppNav/>
    <footer className="hub-footer"><div><strong>A little more to your day.</strong><p>162 Tonetti Street, Halfway House, Midrand</p></div><nav aria-label="Footer destinations"><Link href="/fond">FOND</Link><Link href="/gym">Gym</Link><Link href="/padel">Padel</Link><Link href="/functions">Functions</Link></nav><div><Link href="/hub/privacy">Privacy policy</Link><Link href="/hub/terms">Terms and conditions</Link><Link href="/admin">Team sign in</Link></div></footer>
  </main>;
}
export function HubBack({href,children}:{href:string;children:React.ReactNode}) {return <Link href={href} className="hub-back"><ArrowLeft size={16}/>{children}</Link>;}
export function HubNote({title,children}:{title:string;children:React.ReactNode}) {return <aside className="hub-note"><ShieldCheck/><div><h3>{title}</h3><p>{children}</p></div></aside>;}
export function HubHome() {
 const upcoming=[...listEvents('gym'),...listEvents('padel')].filter(e=>e.calendar!=='gym-classes'&&Date.parse(e.endsAt)>Date.now()).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt)).slice(0,4);
 const hour=Number(new Intl.DateTimeFormat('en-ZA',{timeZone:'Africa/Johannesburg',hour:'numeric',hourCycle:'h23'}).format(new Date()));
 const greeting=hour<12?'Good morning.':hour<18?'Good afternoon.':'Good evening.';
 return <HubShell wide mood="home">
  <section className="hub-home-greeting"><h1>{greeting}</h1><p>More to your day.</p></section>
  <section className="hub-home-photo" aria-label="Life at Midpoint"><img className="hub-home-hero-image" src="/hub-assets/midpoint-hub-exterior.webp" alt="The Midpoint Hub building with FOND, rooftop padel courts and landscaped terraces" width="1280" height="853"/><p>COFFEE. WORKOUT.<br/>A GAME OR A GATHERING.<br/>IT ALL HAPPENS HERE.</p></section>

  <nav id="explore-midpoint" className="hub-app-destinations hub-home-destinations" aria-label="Choose a destination">{[
    {href:'/fond',title:'FOND',photo:'fond-3',action:'ORDER FOOD'},
    {href:'/gym',title:'GYM',photo:'gym-3',action:'CLASSES & ACCESS'},
    {href:'/padel',title:'PADEL',photo:'padel-2',action:'BOOK A COURT'},
    {href:'/functions',title:'FUNCTIONS',photo:'fond-1',action:'PLAN AN EVENT'},
    {href:'/car-wash',title:'CAR WASH',photo:'car-wash',action:'Wash while you work'},
    {href:'https://midpoint.onpointoffices.co.za/the-suites-at-midpoint',title:'THE SUITES',photo:'suites',action:'Corporate accommodation'},
  ].map(item=><Link href={item.href} key={item.href}><img src={`/hub-assets/tile-${item.photo}.webp`} alt="" width="1400" height="933"/><div className="hub-destination-caption"><h2>{item.title}</h2><p>{item.action}</p></div></Link>)}</nav>

  <section className="hub-at-point" aria-labelledby="at-point-title"><div className="hub-at-point-heading"><h2 id="at-point-title">AT THE HUB</h2><Link href="/hub/events">View all <ArrowRight size={14}/></Link></div><HubUpcomingRows events={upcoming.slice(0,3)}/><HubFondHours initialMessage={orderingHoursMessage(settings())}/></section>

  <InstallApp/>

 </HubShell>;
}
export function HubUpcomingRows({events}:{events:ReturnType<typeof listEvents>}) {
 const date=(value:string)=>new Intl.DateTimeFormat('en-ZA',{timeZone:'Africa/Johannesburg',day:'2-digit',month:'short'}).format(new Date(value));
 const time=(value:string)=>new Intl.DateTimeFormat('en-ZA',{timeZone:'Africa/Johannesburg',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
 return events.length?<div className="hub-upcoming-rows">{events.map(event=><Link className="hub-upcoming-row" href={`/${event.service}/interest/${event.id}`} key={event.id}><time dateTime={event.startsAt}><span>{date(event.startsAt)}</span><small>{time(event.startsAt)}</small></time><h3>{event.title}</h3><span className="hub-upcoming-service">{event.service==='gym'?'Gym':'Padel'}</span><ArrowRight size={15}/></Link>)}</div>:<p className="hub-upcoming-empty">New events will appear here as they’re announced.</p>;
}
export function HubAllEvents(){
 const events=[...listEvents('gym'),...listEvents('padel')].filter(e=>e.calendar!=='gym-classes'&&Date.parse(e.endsAt)>Date.now()).sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
 return <HubShell wide mood="home"><HubBack href="/hub">Home</HubBack><section className="hub-all-events"><h1>Upcoming at Midpoint.</h1><p>Find your next event. All times are South African time.</p><HubUpcomingRows events={events}/><nav aria-label="Explore event calendars"><Link href="/gym/events">Gym events <ArrowUpRight size={15}/></Link><Link href="/padel/events">Padel events <ArrowUpRight size={15}/></Link></nav></section></HubShell>;
}
export function HubLanding({service}:{service:HubService}) {
  const gym=service==='gym', contact=HUB_CONTACTS[service];
  const actions=gym?[{href:'/gym/signup',label:'Sign up',copy:'Start your membership journey.',icon:UserRoundPlus},{href:'/gym/events',label:'Join an event',copy:'Find your next shared challenge.',icon:CalendarDays},{href:'/gym/classes',label:'Join a class',copy:'Make movement part of your day.',icon:Dumbbell}]:[{href:'/padel/signup',label:'Tenant signup',copy:'Get your Midpoint tenant profile ready.',icon:UserRoundPlus},{href:'https://playtomic.com/clubs/midpoint-padel',label:'Book a court',copy:'Find your next game on Playtomic.',icon:Volleyball},{href:'/padel/events',label:'Join an event',copy:'Meet the community on court.',icon:CalendarDays}];
  return <HubShell service={service} wide>
    <HubBack href="/hub">Midpoint Hub</HubBack>
    <section className={`hub-personality-hero hub-${service}-hero`}><div className="hub-personality-copy"><span className="hub-eyebrow">MIDPOINT {service.toUpperCase()}</span><h1>{gym?<>Your time.<br/><em>Your strength.</em></>:<>Less scrolling.<br/><em>More rallying.</em></>}</h1><p>{gym?'Step away from the desk. Shake off the day. Find that good-after-a-workout feeling, right here at Midpoint.':'A few good rallies. A little friendly competition. And a very good reason to put your phone down.'}</p>{gym?<Link href="/gym/classes" className="hub-hero-cta">Find my next class <ArrowRight size={18}/></Link>:<a className="hub-hero-cta" href="https://playtomic.com/clubs/midpoint-padel" target="_blank" rel="noopener noreferrer">Let’s book a court <ArrowUpRight size={18}/></a>}</div><div className="hub-scene-wrap"><HubScene kind={service}/><img className="hub-scene-badge" src={`/hub-assets/original/${service}.png`} alt={`Midpoint ${gym?'Gym':'Padel'}`}/><span className="hub-scene-stamp">{gym?<>SHOW UP<br/>FOR YOU</>:<>SEE YOU<br/>ON COURT</>}</span></div></section>
    <div className="hub-mood-strip">{(gym?['A little movement','A fresh headspace','Your own pace']:['Bring your crew','Find your game','Make it a regular thing']).map(t=><span key={t}>{t}</span>)}</div>
    <section className="hub-next" id="your-next-move"><div className="hub-section-heading"><span className="hub-eyebrow">YOUR NEXT MOVE</span><h2>{gym?'Good habits start here.':'See you on the court.'}</h2></div><nav className="hub-actions" aria-label={`${service} actions`}>{actions.map((a,index)=><a href={a.href} key={a.label} aria-label={`Midpoint ${gym?'Gym':'Padel'} ${a.label}`} {...(a.href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{gym?<span className="hub-action-art hub-original-action" style={{'--badge-position':index===0?'0%':index===1?'50%':'100%'} as React.CSSProperties} aria-hidden="true"/>:<span className="hub-action-art hub-original-padel" aria-hidden="true"><img src="/hub-assets/original/padel.png" alt=""/></span>}<b>{a.label} <ArrowUpRight size={19}/></b><p>{a.copy}</p></a>)}</nav></section>
    <section className="hub-service-bottom"><HubNote title={gym?'Your first step? Just say hello.':'Work here? Play here.'}>{gym?'Christine and the team will help you get started. Send your details, then pop into the gym to finish your Itensity registration, payment and access setup.':'Set up your Midpoint tenant profile with Ali and the team. We’ll check your details and help you get ready for Playtomic. Reserve your court separately on Playtomic.'}</HubNote><div className="hub-service-contact"><span className="hub-eyebrow">A REAL PERSON, RIGHT HERE</span><h2>{gym?'Say hello to Christine.':'Talk padel with Ali.'}</h2><a href={`mailto:${contact.email}`}>{contact.email} <ArrowUpRight size={18}/></a><p className="hub-provider">{gym?'Membership & gym access':'Court bookings'} <strong>{gym?'Itensity':'Playtomic'}</strong></p></div></section>
  </HubShell>;
}
export function HubFunctions(){return <HubShell wide mood="functions"><HubBack href="/hub">Midpoint Hub</HubBack><section className="hub-personality-hero hub-feast-hero"><div className="hub-personality-copy"><span className="hub-eyebrow">FUNCTIONS WITH MICHELLE</span><h1>You bring<br/>the people.<br/><em>We’ll bring<br/>the flavour.</em></h1><p>Big birthdays. Team celebrations. Just-because get-togethers. There’s always a good reason to gather around good food.</p><a href="#plan-your-function" className="hub-hero-cta">Let’s plan something lovely <ArrowRight size={18}/></a></div><div className="hub-scene-wrap"><HubScene kind="table"/><span className="hub-scene-stamp">GOOD FOOD<br/>GREAT COMPANY</span></div></section><aside className="hub-michelle-note"><figure className="hub-chef-portrait"><img src="/hub-assets/michelle-strydom-kitchen.png" width="526" height="526" alt="Michelle Strydom at work in a professional kitchen" loading="lazy"/><figcaption>IN THE KITCHEN WITH MICHELLE</figcaption></figure><div className="hub-chef-story"><span className="hub-eyebrow">CREATIVE FOOD. A PERSONAL TOUCH.</span><h2>Meet Michelle Strydom.</h2><p className="hub-chef-intro">A chef’s eye for the details.<br/>A generous table for your people.</p><p>Michelle’s experience spans international kitchens, fine dining and function catering. Previously Executive Sous Chef at The Forum, she now leads operations at FOND.</p><p>From a relaxed braai to a colourful plant-based spread, bring her your ideas. Together, you’ll shape the food, theme and budget into a gathering that feels like you.</p><div className="hub-chef-flavours" aria-label="Michelle’s food inspiration"><span>Fine dining roots</span><span>Sharing tables</span><span>Plant-based ideas</span></div><a href="#plan-your-function">Plan your function with Michelle <ArrowRight size={16}/></a><div className="hub-chef-social"><a href="https://www.instagram.com/crazy.cat.chef/" target="_blank" rel="noopener noreferrer">@crazy.cat.chef <ArrowUpRight size={13}/></a><a href="https://www.linkedin.com/in/michelle-strydom-329269291/" target="_blank" rel="noopener noreferrer">Her chef background <ArrowUpRight size={13}/></a></div></div></aside><FunctionBookingForm/></HubShell>;}
