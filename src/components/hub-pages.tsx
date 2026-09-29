import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Dumbbell, MapPin, ShieldCheck, Volleyball, UserRoundPlus } from 'lucide-react';
import { HUB_CONTACTS, type HubService } from '@/lib/hub-config';
import './hub.css';

export function HubShell({children,service,wide=false}:{children:React.ReactNode;service?:HubService;wide?:boolean}) {
  return <main className={`hub-shell ${service==='padel'?'hub-padel':''} ${wide?'hub-wide':''}`}>
    <header className="hub-top">
      <Link href="/hub" aria-label="Midpoint Hub home"><img src="/hub-assets/hub-logo.png" alt="Midpoint Hub"/></Link>
      <nav aria-label="Hub navigation"><Link href="/fond">FOND</Link><Link href="/gym" aria-current={service==='gym'?'page':undefined}>Gym</Link><Link href="/padel" aria-current={service==='padel'?'page':undefined}>Padel</Link><Link href="/functions">Functions</Link></nav>
      <span className="hub-header-place">MIDRAND, SOUTH AFRICA</span>
    </header>
    <div className="hub-content">{children}</div>
    <footer className="hub-footer"><div><strong>A little more to your day.</strong><p>162 Tonetti Street, Halfway House, Midrand</p></div><nav aria-label="Footer destinations"><Link href="/fond">FOND</Link><Link href="/gym">Gym</Link><Link href="/padel">Padel</Link><Link href="/functions">Functions</Link></nav><div><Link href="/hub/privacy">Your details</Link><Link href="/hub/manage">Team sign in</Link></div></footer>
  </main>;
}
export function HubBack({href,children}:{href:string;children:React.ReactNode}) {return <Link href={href} className="hub-back"><ArrowLeft size={16}/>{children}</Link>;}
export function HubNote({title,children}:{title:string;children:React.ReactNode}) {return <aside className="hub-note"><ShieldCheck/><div><h3>{title}</h3><p>{children}</p></div></aside>;}
export function HubHome() {
  return <HubShell wide>
    <section className="hub-home-hero">
      <div className="hub-home-copy"><span className="hub-eyebrow">THE MIDPOINT WAY OF LIFE</span><h1>Your day.<br/>All at Midpoint.</h1><p>Good food. Fresh energy. A little friendly competition. Make more of the everyday, right here at Midpoint.</p><a href="#destinations" className="hub-explore">Find your Midpoint <ArrowRight size={20}/></a><span className="hub-hero-location"><MapPin size={14}/> Halfway House · Midrand</span></div>
      <div className="hub-home-image"><img src="/images/fond-hero.jpg" alt="The Midpoint Hub building with FOND and rooftop padel courts" fetchPriority="high"/><span>ONE PLACE. MORE POSSIBILITIES.</span></div>
    </section>
    <section className="hub-choose" id="destinations"><div className="hub-section-heading"><span className="hub-eyebrow">MAKE IT YOUR DAY</span><h2>Three ways to feel good.</h2><p>Choose where you’d like to begin.</p></div>
      <nav className="hub-destinations" aria-label="Choose a destination">{[
        {href:'/fond',title:'FOND',copy:'Coffee, good food & rewards',detail:'Your daily pause, done well.',badge:'fond-corrected.png',color:'#974a36',image:'/images/fond-hero.jpg',alt:'FOND at Midpoint'},
        {href:'/gym',title:'Gym',copy:'Find your everyday energy',detail:'Make room for a stronger you.',badge:'gym.png',color:'#003c35',image:'/hub-assets/gym.jpg.png',alt:'Inside Midpoint Gym'},
        {href:'/padel',title:'Padel',copy:'Meet you on the court',detail:'A good game. A great way to unwind.',badge:'padel.png',color:'#2458cb',image:'/hub-assets/padel.jpg.png',alt:'Midpoint rooftop padel courts'},
      ].map((item,index)=><Link href={item.href} key={item.href} style={{'--service':item.color} as React.CSSProperties}><div className="hub-destination-photo"><img src={item.image} alt={item.alt}/><span className="hub-destination-number">0{index+1}</span><span className="hub-round-icon hub-brand-badge"><img src={`/hub-assets/original/${item.badge}`} alt=""/></span></div><div className="hub-destination-copy"><span className="hub-card-category">{index===0?'CAFÉ & EATERY':index===1?'MOVE & RECHARGE':'PLAY & CONNECT'}</span><div className="hub-card-title"><h2>{item.title}</h2><ArrowUpRight/></div><p>{item.copy}</p><span className="hub-card-detail">{item.detail}</span></div></Link>)}</nav>
    </section>
    <section className="hub-gather"><div><span className="hub-eyebrow">BETTER TOGETHER</span><h2>Give your next gathering<br/>a change of scene.</h2></div><div><p>Meetings, team days and special occasions. Let’s make something of it.</p><Link href="/functions">Plan a function <ArrowUpRight size={20}/></Link></div></section>
  </HubShell>;
}
export function HubLanding({service}:{service:HubService}) {
  const gym=service==='gym', contact=HUB_CONTACTS[service];
  const actions=gym?[{href:'/gym/signup',label:'Sign up',copy:'Start your membership journey.',icon:UserRoundPlus},{href:'/gym/events',label:'Join an event',copy:'Find your next shared challenge.',icon:CalendarDays},{href:'/gym/classes',label:'Join a class',copy:'Make movement part of your day.',icon:Dumbbell}]:[{href:'/padel/signup',label:'Tenant signup',copy:'Get your Midpoint tenant profile ready.',icon:UserRoundPlus},{href:'https://playtomic.com/',label:'Book a court',copy:'Find your next game on Playtomic.',icon:Volleyball},{href:'/padel/events',label:'Join an event',copy:'Meet the community on court.',icon:CalendarDays}];
  return <HubShell service={service} wide>
    <HubBack href="/hub">Midpoint Hub</HubBack>
    <section className="hub-service-hero"><div className="hub-landing"><span className="hub-eyebrow">MIDPOINT {service.toUpperCase()}</span><h1>{gym?<>Make time<br/>for your strength.</>:<>A better way<br/>to end your day.</>}</h1><p>{gym?'A great workout, a fresh start. Right here on the estate.':'Good rallies. Great company. Your next game starts here.'}</p><a href="#your-next-move" className="hub-explore">{gym?'Find your next move':'Let’s get you playing'} <ArrowRight size={20}/></a></div><div className="hub-photo"><img src={`/hub-assets/${service}.jpg.png`} alt={gym?'Midpoint Gym training floor':'Midpoint rooftop padel courts'} fetchPriority="high"/><span>{gym?'MOVE & RECHARGE':'PLAY & UNWIND'}</span></div></section>
    <section className="hub-next" id="your-next-move"><div className="hub-section-heading"><span className="hub-eyebrow">YOUR NEXT MOVE</span><h2>{gym?'Good habits start here.':'See you on the court.'}</h2></div><nav className="hub-actions" aria-label={`${service} actions`}>{actions.map((a,index)=><a href={a.href} key={a.label} aria-label={`Midpoint ${gym?'Gym':'Padel'} ${a.label}`} {...(a.href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}>{gym?<span className="hub-action-art hub-original-action" style={{'--badge-position':index===0?'0%':index===1?'50%':'100%'} as React.CSSProperties} aria-hidden="true"/>:<span className="hub-action-art hub-original-padel" aria-hidden="true"><img src="/hub-assets/original/padel.png" alt=""/></span>}<b>{a.label} <ArrowUpRight size={19}/></b><p>{a.copy}</p></a>)}</nav></section>
    <section className="hub-service-bottom"><HubNote title={gym?'Your membership starts here':'A Midpoint tenant? Let’s get you playing.'}>{gym?'Send us your details, then visit the gym. Our team will complete your Itensity registration, finalise payment and set up your gym access.':'Request your tenant setup. Our team will verify your details and help get your Playtomic profile ready. Court bookings are confirmed separately.'}</HubNote><div className="hub-service-contact"><span className="hub-eyebrow">LET’S GET YOU STARTED</span><h2>Talk to {contact.name}.</h2><a href={`mailto:${contact.email}`}>{contact.email} <ArrowUpRight size={18}/></a><p className="hub-provider">{gym?'Membership & gym access':'Court bookings'} <strong>{gym?'Itensity':'Playtomic'}</strong></p></div></section>
  </HubShell>;
}
export function HubFunctions() {return <HubShell><HubBack href="/hub">Midpoint Hub</HubBack><section className="hub-hero"><span className="hub-eyebrow">GET TOGETHER AT MIDPOINT</span><h1>Make it<br/>an occasion.</h1><p>Planning a meeting, team gathering or function? Speak to Michelle about your date, group size and what you have in mind.</p></section><a className="hub-primary" href="mailto:michelle@midpointhub.com?subject=Midpoint%20function%20enquiry">Enquire with Michelle <ArrowRight/></a><p className="hub-helper">Availability, catering and pricing are confirmed by the team.</p></HubShell>;}
