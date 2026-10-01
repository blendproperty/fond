import Link from 'next/link';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {HubAppNav} from './hub-app-nav';
import './hub.css';
import './hub-personality.css';
import './gym-pages.css';
export function ServiceLanding({service,image,alt,title,description,href,action,children}:{service:'Gym'|'FOND';image:string;alt:string;title:React.ReactNode;description:string;href:string;action:string;children:React.ReactNode}){return <main className="gym-experience service-landing"><header className="gym-page-header"><Link href="/hub" aria-label="Midpoint Home"><ArrowLeft size={21}/></Link><Link href={service==='Gym'?'/gym':'/fond'} className="gym-wordmark" aria-label={`Midpoint ${service}`}>MIDPOINT<span>{service.toUpperCase()}</span></Link><Link href={href} aria-label={service==='Gym'?'Gym class calendar':'FOND ordering menu'}><ArrowRight size={21}/></Link></header><section className="gym-photo-hero"><img src={image} alt={alt} width="1400" height="933" fetchPriority="high"/><div className="gym-hero-content"><h1>{title}</h1><p>{description}</p><Link className="gym-primary" href={href}>{action}<ArrowRight size={19}/></Link></div></section>{children}<footer className="gym-page-footer"><Link href="/hub/privacy">Privacy policy</Link><Link href="/hub/terms">Terms and conditions</Link></footer><HubAppNav/></main>}
