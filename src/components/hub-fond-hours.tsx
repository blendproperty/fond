"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {orderingHoursMessage,type TradingHours} from '@/lib/trading-hours';
type HoursSettings=TradingHours&{orderingEnabled:boolean;enforceHours:boolean};
export function HubFondHours({initialMessage}:{initialMessage:string}){
 const [message,setMessage]=useState(initialMessage);
 useEffect(()=>{
  let active=true,controller:AbortController|undefined;
  async function refresh(){
   controller?.abort();controller=new AbortController();
   try{const response=await fetch('/api/store',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error('Hours unavailable');const data=await response.json();const hours=data.settings as HoursSettings;if(!hours||!Array.isArray(hours.openDays)||typeof hours.openingTime!=='string'||typeof hours.closingTime!=='string')throw new Error('Hours unavailable');if(active)setMessage(orderingHoursMessage(hours));}
   catch(error){if(active&&!(error instanceof DOMException&&error.name==='AbortError'))setMessage('Opening hours unavailable');}
  }
  function onVisible(){if(document.visibilityState==='visible')void refresh();}
  void refresh();const timer=window.setInterval(()=>void refresh(),60000);document.addEventListener('visibilitychange',onVisible);
  return()=>{active=false;controller?.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
 },[]);
 return <Link className="hub-fond-hours" href="/fond"><span className="hub-fond-hours-dot" aria-hidden="true"/><span aria-live="polite">FOND {message.charAt(0).toLowerCase()+message.slice(1)}</span></Link>;
}
