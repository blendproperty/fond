import Link from 'next/link';

const calendarUrl = 'https://midpointgym.new.itensityonline.com/members/bookings/widget?gym_id=1166&dom_id=1&dc=midpointgym.itensityonline.com';

export function GymClasses() {
  return <>
    <section className="hub-intro">
      <span className="hub-eyebrow">MAKE SPACE FOR MOVEMENT</span>
      <h1>Find your next class.</h1>
      <p>Explore the schedule and book your place through Itensity.</p>
    </section>
    <nav className="hub-tabs" aria-label="Gym schedule"><Link href="/gym/classes" aria-current="page">Classes</Link><Link href="/gym/events">Events</Link></nav>
    <iframe className="gym-classes-calendar" src={calendarUrl} title="Midpoint Gym class bookings" referrerPolicy="strict-origin-when-cross-origin"/>
    <p className="hub-helper">If the calendar does not load or asks you to sign in, <a className="gym-calendar-link" href={calendarUrl} target="_blank" rel="noopener noreferrer">open Itensity in a new tab</a>.</p>
  </>;
}
