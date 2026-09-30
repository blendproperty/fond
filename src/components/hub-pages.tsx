import Link from 'next/link';
import { Coffee, ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Dumbbell, MapPin, ShieldCheck, Volleyball, UserRoundPlus } from 'lucide-react';
import { HUB_CONTACTS, type HubService } from '@/lib/hub-config';
import './hub.css';
import './hub-personality.css';
import { HubScene } from './hub-scene';
import { FunctionBookingForm } from './function-booking';
import { HubAppNav } from './hub-app-nav';

export function HubShell({children,service,wide=false,mood}:{children:React.ReactNode;service?:HubService;wide?:boolean;mood?:'home'|'functions'}) {
  return <main className={`hub-shell hub-app ${service==='padel'?'hub-padel':''} ${wide?'hub-wide':''} hub-mood-${mood||service||'neutral'}`}>
    <header className="hub-top">
      <Link href="/hub" aria-label="Midpoint Hub home"><img src="/hub-assets/hub-logo-stacked.svg" width="180" height="120" alt="Midpoint Hub"/></Link>
      <nav aria-label="Hub navigation"><Link href="/fond">FOND</Link><Link href="/gym" aria-current={service==='gym'?'page':undefined}>Gym</Link><Link href="/padel" aria-current={service==='padel'?'page':undefined}>Padel</Link><Link href="/functions">Functions</Link></nav>
      <span className="hub-page-label">{mood==='functions'?'GATHER · FEAST · CELEBRATE':service==='gym'?'MOVE · RESET · REPEAT':service==='padel'?'MEET · PLAY · REPEAT':'A LITTLE MORE TO YOUR DAY'}</span>
    </header>
    <div className="hub-content">{children}</div>
    <HubAppNav/>
    <footer className="hub-footer"><div><strong>A little more to your day.</strong><p>162 Tonetti Street, Halfway House, Midrand</p></div><nav aria-label="Footer destinations"><Link href="/fond">FOND</Link><Link href="/gym">Gym</Link><Link href="/padel">Padel</Link><Link href="/functions">Functions</Link></nav><div><Link href="/hub/privacy">Your details</Link><Link href="/hub/manage">Team sign in</Link></div></footer>
  </main>;
}
export function HubBack({href,children}:{href:string;children:React.ReactNode}) {return <Link href={href} className="hub-back"><ArrowLeft size={16}/>{children}</Link>;}
export function HubNote({title,children}:{title:string;children:React.ReactNode}) {return <aside className="hub-note"><ShieldCheck/><div><h3>{title}</h3><p>{children}</p></div></aside>;}
export function HubHome() {
 return <HubShell wide mood="home">
  <section className="hub-personality-hero hub-food-hero"><div className="hub-personality-copy"><span className="hub-eyebrow">GOOD DAYS START WITH SOMETHING GOOD</span><h1>First, something<br/><em>delicious.</em></h1><p>A proper coffee. A bite from FOND. A little pause that makes the rest of your day better.</p><Link className="hub-hero-cta" href="/fond">Grab a bite at FOND <ArrowRight size={18}/></Link></div><div className="hub-scene-wrap"><HubScene kind="coffee"/><img className="hub-scene-badge" src="/hub-assets/original/fond-corrected.png" alt="FOND"/><span className="hub-scene-stamp">YOUR DAILY<br/>GOOD THING</span></div></section>
  <div className="hub-section-intro"><div><span className="hub-eyebrow">WELCOME TO YOUR MIDPOINT</span><h2>Make a little time for you.</h2></div><p>Eat well. Move a little. Stay for a game.</p></div>
  <nav className="hub-app-destinations" aria-label="Choose a destination">{[
    {href:'/fond',title:'FOND',copy:'Your happy food place',badge:'fond-corrected.png'},
    {href:'/gym',title:'Gym',copy:'Find your feel-good',badge:'gym.png'},
    {href:'/padel',title:'Padel',copy:'A little friendly rivalry',badge:'padel.png'},
  ].map(item=><Link href={item.href} key={item.href}><img src={`/hub-assets/original/${item.badge}`} alt=""/><h2>{item.title}</h2><p>{item.copy}</p><span>Let’s go <ArrowUpRight size={16}/></span></Link>)}</nav>
  <section className="hub-app-shortcuts"><h2>What’s the plan?</h2><div><Link href="/fond"><Coffee/><span>Grab a bite<small>Order something good from FOND</small></span><ArrowRight size={17}/></Link><a href="https://playtomic.com/clubs/midpoint-padel" target="_blank" rel="noopener noreferrer"><Volleyball/><span>Book a court<small>Open Midpoint on Playtomic</small></span><ArrowUpRight size={17}/></a><Link href="/functions"><CalendarDays/><span>Get together<small>Plan a function with Michelle</small></span><ArrowRight size={17}/></Link></div></section>
 </HubShell>;
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
export function HubFunctions(){return <HubShell wide mood="functions"><HubBack href="/hub">Midpoint Hub</HubBack><section className="hub-personality-hero hub-feast-hero"><div className="hub-personality-copy"><span className="hub-eyebrow">FUNCTIONS WITH MICHELLE</span><h1>You bring<br/>the people.<br/><em>We’ll bring<br/>the flavour.</em></h1><p>Big birthdays. Team celebrations. Just-because get-togethers. There’s always a good reason to gather around good food.</p><a href="#plan-your-function" className="hub-hero-cta">Let’s plan something lovely <ArrowRight size={18}/></a></div><div className="hub-scene-wrap"><HubScene kind="table"/><span className="hub-scene-stamp">GOOD FOOD<br/>GREAT COMPANY</span></div></section><aside className="hub-michelle-note"><span className="hub-chef-monogram" aria-hidden="true">M<span>✳</span></span><div><span className="hub-eyebrow">YOUR CHEF & FUNCTION CONTACT</span><h2>Meet Michelle Strydom.</h2><p>A relaxed braai or a beautifully seated dinner? Tell Michelle what you have in mind. She’ll work through the food, theme and budget with you, so your gathering feels like yours.</p><a href="#plan-your-function">Start with your idea <ArrowRight size={16}/></a></div></aside><FunctionBookingForm/></HubShell>;}
