'use client';
import {useEffect} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {HubDestinationIcon,type HubDestination} from './hub-destination-icon';
export function HubAppNav(){const path=usePathname();useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});},[]);return <nav className="hub-app-nav" aria-label="App navigation">{[{href:'/hub',name:'HOME',icon:'home'},{href:'/fond',name:'FOND',icon:'fond'},{href:'/gym',name:'GYM',icon:'gym'},{href:'/padel',name:'PADEL',icon:'padel'},{href:'/functions',name:'FUNCTIONS',icon:'functions'},{href:'/profile',name:'PROFILE',icon:'profile'}].map(({href,name,icon})=><Link key={href} href={href} aria-label={name==='FOND'?name:name.charAt(0)+name.slice(1).toLowerCase()} aria-current={(href==='/hub'?(path==='/'||path==='/hub'||path.startsWith('/car-wash')||path.startsWith('/suites')):href==='/profile'?(path.startsWith('/profile')||path==='/account'||path==='/rewards'):path.startsWith(href))?'page':undefined}><HubDestinationIcon destination={icon as HubDestination} size={21}/><span>{name}</span></Link>)}</nav>}
