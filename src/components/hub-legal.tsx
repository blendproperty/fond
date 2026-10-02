import Link from 'next/link';
import { ShieldCheck, FileText, ArrowUpRight } from 'lucide-react';
import {EcosystemShell} from './ecosystem-shell';
import { HUB_CONTACTS } from '@/lib/hub-config';
import { legalEdition, privacySections, termsSections } from '@/lib/hub-legal';
import './hub-legal.css';

export function HubLegal({kind}:{kind:'privacy'|'terms'}) {
 const privacy=kind==='privacy';
 const title=privacy?'Privacy policy':'Terms and conditions';
 const sections=privacy?privacySections:termsSections;
 const Icon=privacy?ShieldCheck:FileText;
 return <EcosystemShell service="Profile" back="/hub">
  <article className="hub-legal" aria-label={title}>
   <header className="hub-legal-heading"><Icon size={32} aria-hidden="true"/><span className="hub-eyebrow">THE DETAILS, CLEARLY</span><h1>{title}</h1><p>{privacy?'Your information, your choices and how to reach us.':'A clear guide to orders, enquiries and using your Hub.'}</p><small>Edition: {legalEdition} · South Africa</small></header>
   <nav className="hub-legal-tabs" aria-label="Legal pages"><Link href="/hub/privacy" aria-current={privacy?'page':undefined}>Privacy policy</Link><Link href="/hub/terms" aria-current={!privacy?'page':undefined}>Terms and conditions</Link></nav>
   <details className="hub-legal-contents"><summary>Jump to a section</summary><ol>{sections.map(s=><li key={s.id}><a href={`#${s.id}`}>{s.title}</a></li>)}</ol></details>
   {sections.map((section,index)=><section id={section.id} key={section.id}><h2><span>{String(index+1).padStart(2,'0')}</span>{section.title}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}</section>)}
   <section id="contacts"><h2>Speak to the right person</h2><p>For privacy and legal requests: <a href="mailto:legal@blendproperty.co.za">Mark Corbishley · legal@blendproperty.co.za</a></p><div className="hub-legal-contacts">{Object.entries(HUB_CONTACTS).map(([service,c])=><a key={service} href={`mailto:${c.email}`}><strong>{service==='fond'?'FOND':service[0].toUpperCase()+service.slice(1)} · {c.name}</strong><span>{c.email}</span><ArrowUpRight size={16}/></a>)}</div><p><a href="https://inforegulator.org.za/complaints/" target="_blank" rel="noopener noreferrer">Information Regulator: complaints and forms ↗</a></p></section>
   <p className="hub-legal-end">Keep a copy using your browser’s Print or Save as PDF option.</p>
  </article>
 </EcosystemShell>;
}
