'use client';
import {useEffect} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Home,Coffee,Dumbbell,Volleyball,CalendarDays} from 'lucide-react';
export function HubAppNav(){const path=usePathname();useEffect(()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});},[]);return <nav className="hub-app-nav" aria-label="App navigation">{[{href:'/hub',name:'Home',icon:Home},{href:'/fond',name:'FOND',icon:Coffee},{href:'/gym',name:'Gym',icon:Dumbbell},{href:'/padel',name:'Padel',icon:Volleyball},{href:'/functions',name:'Functions',icon:CalendarDays}].map(({href,name,icon:Icon})=><Link key={href} href={href} aria-current={(href==='/hub'?(path==='/'||path==='/hub'):path.startsWith(href))?'page':undefined}><Icon size={21}/><span>{name}</span></Link>)}</nav>}
