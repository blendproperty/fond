import Link from 'next/link';

import {ArrowLeft,ArrowRight,UserRound,CalendarDays,CreditCard,Info,UserRoundPlus,UsersRound} from 'lucide-react';

import {HubAppNav} from './hub-app-nav';

import {HUB_CONTACTS} from '@/lib/hub-config';

import {ServiceLanding} from './service-landing';

import './hub.css';

import './hub-personality.css';

import './gym-pages.css';

import {GymMembershipPrices} from './gym-membership-prices';
import {GymHours} from './gym-hours';



export function GymShell({children}:{children:React.ReactNode}){return <main className="gym-experience"><header className="gym-page-header"><Link href="/gym" aria-label="Back to Gym"><ArrowLeft size={21}/></Link><Link href="/gym" className="gym-wordmark" aria-label="Midpoint Gym">MIDPOINT<span>GYM</span></Link><Link href="/profile" aria-label="Your profile"><UserRound size={20}/></Link></header>{children}<footer className="gym-page-footer"><Link href="/hub/privacy">Privacy policy</Link><Link href="/hub/terms">Terms and conditions</Link></footer><HubAppNav/></main>}

const actions=[{href:'/gym/membership',label:'Membership options',icon:UsersRound},{href:'/gym/signup',label:'Join now',icon:UserRoundPlus},{href:'/gym/access',label:'Your access',icon:CreditCard},{href:'/gym/info',label:'Gym info',icon:Info},{href:'/gym/events',label:'Gym events',icon:CalendarDays}];

export function GymLanding(){return <ServiceLanding service="Gym" image="/hub-assets/tile-gym-3.webp" alt="The Midpoint gym with training equipment and free weights" title={<>Move<br/>better.<br/>Work<br/>happier.</>} description="A fully equipped gym, expert trainers and a class schedule designed for busy days." href="/gym/classes" action="View classes"><nav className="gym-landing-actions" aria-label="Gym actions">{actions.map(({href,label,icon:Icon})=><Link key={href} href={href}><Icon size={20} strokeWidth={1.7}/><span>{label}</span><ArrowRight size={16}/></Link>)}</nav></ServiceLanding>}

export function GymInformation({section}:{section:'membership'|'access'|'info'}){const contact=HUB_CONTACTS.gym;return <GymShell><section className="gym-information"><p className="gym-kicker">MIDPOINT / GYM</p><h1>{section==='membership'?'Make movement a habit.':section==='access'?'Your next step inside.':'A little more movement.'}</h1>{section==='membership'?<><p>Find the membership that fits your working day.</p><GymMembershipPrices/><div className="gym-information-card"><h2>Start with the Gym team</h2><p>Leave your details and we’ll help sign you up to Itensity. Or pop into the gym and we’ll do it together.</p><p>The team will confirm your membership. Sending a request does not activate gym access.</p></div><Link className="gym-primary" href="/gym/signup">Join now <ArrowRight size={18}/></Link></>:section==='access'?<><p>Your membership and gym access are arranged with the Gym team through Itensity.</p><div className="gym-information-card"><h2>Ready for your first visit?</h2><p>If you have sent a signup request, contact Christine or visit the gym to finish registration, payment and access setup.</p><h2>Already a member?</h2><p>The Gym team can help with your access setup or an access problem. Your current membership or access status is not displayed in this app.</p></div></>:<><p>A fully equipped gym at Midpoint Hub. Make room for movement before work, between meetings or at the end of your day.</p><div className="gym-information-card"><h2>Find us</h2><p>Midpoint Hub<br/>162 Tonetti Street, Halfway House, Midrand</p><GymHours/><h2>Plan your visit</h2><p>Browse the published classes and events. The Gym team can help with trainer availability and membership details.</p></div><Link className="gym-primary" href="/gym/classes">View classes <ArrowRight size={18}/></Link></>}<a className="gym-contact" href={`mailto:${contact.email}`}>Contact {contact.name}<span>{contact.email}</span><ArrowRight size={18}/></a><Link className="gym-back" href="/gym"><ArrowLeft size={16}/> Back to Gym</Link></section></GymShell>}
