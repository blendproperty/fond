import {Home,Coffee,Dumbbell,Volleyball,CalendarDays,UserRound} from 'lucide-react';
export type HubDestination = 'home' | 'fond' | 'gym' | 'padel' | 'functions' | 'profile';
const icons={home:Home,fond:Coffee,gym:Dumbbell,padel:Volleyball,functions:CalendarDays,profile:UserRound};
export function HubDestinationIcon({destination,size=24}:{destination:HubDestination;size?:number}) {
 const Icon=icons[destination];
 return <Icon size={size} strokeWidth={1.6} aria-hidden="true"/>;
}

