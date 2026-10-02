import Link from 'next/link';
import {ArrowLeft,UserRound} from 'lucide-react';
import {HubAppNav} from './hub-app-nav';
import './hub.css';
import './hub-personality.css';
import './gym-pages.css';
import './ecosystem.css';
export function EcosystemHeader({service,back}:{service:string;back:string}){return <header className="gym-page-header"><Link href={back} aria-label={back==='/hub'?'Midpoint Hub':`Back to ${service}`}><ArrowLeft size={21}/></Link><Link href={service==='Profile'?'/profile':`/${service.toLowerCase()}`} className="gym-wordmark">MIDPOINT<span>{service.toUpperCase()}</span></Link>{service==='Profile'?<span style={{width:44}}/>:<Link href="/profile" aria-label="Your profile"><UserRound size={20}/></Link>}</header>}
export function EcosystemShell({service,children,back}:{service:'Functions'|'Profile';children:React.ReactNode;back?:string}){return <main className="gym-experience ecosystem-page"><EcosystemHeader service={service} back={back??`/${service.toLowerCase()}`}/>{children}<footer className="gym-page-footer"><Link href="/hub/privacy">Privacy policy</Link><Link href="/hub/terms">Terms and conditions</Link></footer><HubAppNav/></main>}

