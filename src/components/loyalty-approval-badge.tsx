'use client';
import {useEffect,useState} from 'react';
import './loyalty-approval-badge.css';
const queue='/admin?section=loyalty#coupon-approval-queue';
export function LoyaltyApprovalBadge({compact=false}:{compact?:boolean}){
 const [pending,setPending]=useState(0);
 useEffect(()=>{
  let active=true,running=false,queued=false;const controller=new AbortController();
  const refresh=async()=>{if(running){queued=true;return;}running=true;try{const r=await fetch('/api/admin/loyalty-approvals?count=1',{cache:'no-store',signal:controller.signal});const d=r.ok?await r.json():null;if(active)setPending(Number.isSafeInteger(d?.pending)&&d.pending>0?d.pending:0);}catch{/* Keep the last known badge until the next refresh. */}finally{running=false;if(queued&&active){queued=false;void refresh();}}};
  void refresh();const timer=setInterval(()=>void refresh(),30000);window.addEventListener('focus',refresh);window.addEventListener('loyalty-approvals-changed',refresh);
  return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('loyalty-approvals-changed',refresh);};
 },[]);
 if(!pending)return null;
 const count=<span className="loyalty-approval-count" aria-label={`${pending} pending loyalty approvals`} aria-live="polite">{pending}</span>;
 return compact?count:<a className="loyalty-approval-alert" href={queue} aria-label={`Loyalty approvals: ${pending} pending`}>Loyalty approvals {count}</a>;
}
