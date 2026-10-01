'use client';
import {useEffect} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {HubDestinationIcon,type HubDestination} from './hub-destination-icon';
export function HubAppNav(){const path=usePathname();useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});},[]);return <nav className="hub-app-nav" aria-label="App navigation">{[{href:'/hub',name:'Home',icon:'home'},{href:'/fond',name:'FOND',icon:'fond'},{href:'/gym',name:'Gym',icon:'gym'},{href:'/padel',name:'Padel',icon:'padel'},{href:'/functions',name:'Functions',icon:'functions'}].map(({href,name,icon})=><Link key={href} href={href} aria-current={(href==='/hub'?(path==='/'||path==='/hub'):path.startsWith(href))?'page':undefined}><HubDestinationIcon destination={icon as HubDestination} size={21}/><span>{name}</span></Link>)}</nav>}
