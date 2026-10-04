'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {HUB_CONTACTS} from '@/lib/hub-config';

const calendarUrl = 'https://midpointgym.new.itensityonline.com/members/bookings/widget?gym_id=1166&dom_id=1&dc=midpointgym.itensityonline.com';

export function GymClasses() {
  const [attempt,setAttempt]=useState(0),[state,setState]=useState<'loading'|'frame-open'|'delayed'>('loading');
  useEffect(()=>{const timer=setTimeout(()=>setState(current=>current==='loading'?'delayed':current),15000);return()=>clearTimeout(timer);},[attempt]);
  return <>
    <section className="hub-intro">
      <span className="hub-eyebrow">MAKE SPACE FOR MOVEMENT</span>
      <h1>Find your next class.</h1>
      <p>Explore the schedule and book your place through Itensity.</p>
    </section>
    <nav className="hub-tabs" aria-label="Gym schedule"><Link href="/gym/classes" aria-current="page">Classes</Link><Link href="/gym/events">Events</Link></nav>
    <section className="gym-calendar-help" aria-label="Class booking help"><h2>Book directly with Itensity</h2><p>The schedule and member sign-in are provided by Itensity. You can also <a className="gym-calendar-link" href={calendarUrl} target="_blank" rel="noopener noreferrer">open Itensity in a new tab</a>.</p><p>If you need help choosing a class or completing your booking, <a href={`mailto:${HUB_CONTACTS.gym.email}`}>contact Christine</a>.</p><p role="status">{state==='loading'?'Opening the Itensity calendar…':state==='delayed'?'The calendar frame is taking longer to open. Use the direct link above or contact the Gym team.':'Calendar frame opened. If class details are still loading or sign-in is required, use the direct link above.'}</p><button type="button" onClick={()=>{setState('loading');setAttempt(n=>n+1);}}>Reload calendar</button></section>
    <iframe key={attempt} className="gym-classes-calendar" src={calendarUrl} title="Midpoint Gym class bookings" referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>setState('frame-open')} onError={()=>setState('delayed')}/>
    <p className="hub-helper">A loading frame does not confirm a booking. Follow Itensity's confirmation steps or ask the Gym team for help.</p>
  </>;
}
