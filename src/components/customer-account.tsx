'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,Coffee,Mail,ShieldCheck,ShoppingBag,CheckCircle2} from 'lucide-react';
import {HubAppNav} from './hub-app-nav';
import './fond-experience.css';
import {CoffeeRewards} from './coffee-rewards';
import {AccountAccess} from './account-access';
import {AccountSecurity} from './account-security';
import {EcosystemHeader} from './ecosystem-shell';
import './ecosystem.css';
import {BrandLogo} from './brand-logo';
import {formatCollectionTime} from '@/lib/fulfilment';
import styles from './customer-account.module.css';

type User={id:string;email:string;emailVerified:boolean};
type Order={reference:string;displayReference:string;status:string;createdAt:string;collectionTime:string;totalCents:number;lines:{id?:string;name:string;quantity:number;subtotalCents:number;note?:string}[];payment:{paidCents:number}};
export function CustomerAccount({view='orders'}:{view?:'orders'|'rewards'|'details'}){
 const [counterEnabled,setCounterEnabled]=useState(false);
 useEffect(()=>{fetch('/api/store',{cache:'no-store'}).then(r=>r.json()).then(d=>setCounterEnabled(!!d.counterRewards)).catch(()=>{});},[]);
 const [historyLoaded,setHistoryLoaded]=useState(false),[historyBusy,setHistoryBusy]=useState(false);
 const [user,setUser]=useState<User|null>(null),[orders,setOrders]=useState<Order[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[verificationMessage,setVerificationMessage]=useState(''),[verificationError,setVerificationError]=useState(false),[verificationBusy,setVerificationBusy]=useState(false);
 async function refresh(){
  const response=await fetch('/api/auth/session',{cache:'no-store'});if(!response.ok)throw new Error('Could not load your account. Please try again.');const session=await response.json();setUser(session.user??null);
  if(session.user&&view==='orders'){const response=await fetch('/api/account/orders',{cache:'no-store'});if(!response.ok)throw new Error('Could not load your orders. Please try again.');const result=await response.json();setOrders(result.orders??[]);setHistoryLoaded(true);}else{setOrders([]);setHistoryLoaded(false);}
  setError('');setLoading(false);
 }
 useEffect(()=>{refresh().catch(e=>{setError(e.message);setLoading(false);});},[view]);
 // Refresh history without changing purchase-time ownership or reward eligibility.
 useEffect(()=>{
  if(!user||view!=='orders')return;
  const controller=new AbortController();let pending=false;
  async function update(){
   if(pending||document.visibilityState==='hidden')return;pending=true;
   try{const response=await fetch('/api/account/orders',{cache:'no-store',signal:controller.signal});
    if(response.status===401){setUser(null);setOrders([]);setHistoryLoaded(false);return;}
    if(!response.ok)throw new Error('Could not refresh your orders. Showing the last loaded details.');
    const result=await response.json();if(!controller.signal.aborted){setOrders(result.orders??[]);setHistoryLoaded(true);setError('');}
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not refresh your orders.');}finally{pending=false;}
  }
  const timer=setInterval(update,15000);window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[user?.id,view]);
 async function refreshHistory(){setHistoryBusy(true);try{await refresh();}catch(e){setError(e instanceof Error?e.message:'Could not refresh your orders.');}finally{setHistoryBusy(false);}}
 async function sendCode(){
  setVerificationBusy(true);setVerificationMessage('');setVerificationError(false);
  try{const response=await fetch('/api/account/verification',{method:'POST'}),result=await response.json();if(!response.ok)throw new Error(result.message??'Could not send the code.');setVerificationMessage('Verification code sent. Check your inbox.');}
  catch(e){setVerificationError(true);setVerificationMessage(e instanceof Error?e.message:'Could not send the code. Please try again.');}finally{setVerificationBusy(false);}
 }
 async function confirmCode(event:React.FormEvent){
  event.preventDefault();setVerificationBusy(true);setVerificationMessage('');setVerificationError(false);
  try{const response=await fetch('/api/account/verification',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})}),result=await response.json();if(!response.ok)throw new Error(result.message??'Could not verify email.');setVerificationMessage('Email verified.');setCode('');await refresh();}
  catch(e){setVerificationError(true);setVerificationMessage(e instanceof Error?e.message:'Could not verify your email. Please try again.');}finally{setVerificationBusy(false);}
 }
 async function logout(){setBusy(true);setError('');try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error('Could not sign out. Please try again.');setCode('');setVerificationMessage('');await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <main className={`${styles.page} profile-account gym-experience`}>
  <EcosystemHeader service="Profile" back="/profile"/>
  <div className={styles.intro}><p className={styles.eyebrow}>{view==='details'?'YOUR MIDPOINT ACCOUNT':'A LITTLE MORE FOND OF EVERY DAY'}</p><h1>{view==='details'?'My details & security':view==='rewards'?'Coffee rewards':user?'Your orders':'Your daily FOND favourites.'}</h1><p>{view==='details'?'View your account email, verify it and manage optional two-factor sign-in.':user?'Your orders, your coffee rewards and your next little lift. All in one place.':'Good food, great coffee and something to look forward to. Make yourself at home.'}</p></div>
  <div className={`${styles.layout} ${user&&view==='rewards'?styles.rewardsLayout:''}`}>
   <div className={styles.content} id="customer-access">
    {loading?<section className={styles.card} aria-busy="true"><p role="status">Getting your account ready…</p></section>:user?<>
     <div className={styles.identity}><div><span>Signed in as {user.email}</span><small>{user.emailVerified?<><CheckCircle2 size={14} aria-hidden="true"/> Email verified</>:<><Mail size={14} aria-hidden="true"/> Email verification needed</>}</small></div><button className={styles.textButton} disabled={busy} onClick={logout}>Sign out</button></div>
     <nav className={styles.tabs} aria-label="Your account"><Link href="/profile/orders" aria-current={view==='orders'?'page':undefined}><ShoppingBag size={18} aria-hidden="true"/> Your orders</Link><Link href="/profile/rewards" aria-current={view==='rewards'?'page':undefined}><Coffee size={18} aria-hidden="true"/> Coffee rewards</Link></nav>
     {error&&<p className={styles.error} role="alert">{error}</p>}
     {!user.emailVerified&&<section className={`${styles.card} ${styles.verification}`} aria-labelledby="verify-heading">
      <span className={styles.icon}><Mail size={26} aria-hidden="true"/></span><p className={styles.eyebrow}>ONE LAST STEP</p><h2 id="verify-heading">Verify your email</h2><p>Let's make this account yours. Confirm your email to start collecting coffee stamps and unlock your rewards.</p>
      <div className={styles.verifyStep}><span className={styles.stepNumber}>1</span><div><h3>Check your inbox</h3><p>We'll send a six-digit code to <strong>{user.email}</strong>.</p><button className={styles.secondary} disabled={verificationBusy} onClick={sendCode}>Send verification code</button></div></div>
      <form className={styles.verifyStep} onSubmit={confirmCode}><span className={styles.stepNumber}>2</span><div><h3>Make it official</h3><label className={styles.field}>Six digit code<input className={styles.codeInput} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" required/></label><button className={styles.primary} type="submit" disabled={verificationBusy||code.length!==6}>{verificationBusy?'Please wait…':'Verify email'}<ArrowRight size={17} aria-hidden="true"/></button></div></form>
      {verificationMessage&&<p className={verificationError?styles.error:styles.success} role={verificationError?'alert':'status'}>{verificationMessage}</p>}
      <p className={styles.hint}>Can't find the email? Check your spam folder, then request another code.</p>
     </section>}
     {view!=='rewards'&&<AccountSecurity emailVerified={user.emailVerified}/>}
     {view==='rewards'?<><CoffeeRewards key={String(user.emailVerified)}/><AccountSecurity emailVerified={user.emailVerified}/></>:view==='details'?<section className={styles.card}><h2>Your account details</h2><p>{user.email}</p><p>For Gym membership or tenant details, contact the relevant team from <Link href="/profile/help">Help &amp; contact</Link>.</p></section>:<>
      <div className={styles.historyTools}><p>Updates automatically every 15 seconds.</p><button className={styles.secondary} disabled={historyBusy} onClick={refreshHistory}>{historyBusy?'Refreshing…':'Refresh orders'}</button></div>
      {orders.length?<div className={styles.orders}>{orders.map(order=><article key={order.reference} className={`${styles.card} ${styles.order}`}><div className={styles.orderHeading}><h2>{order.displayReference}</h2><span>{order.status.replaceAll('_',' ')}</span></div><p>{new Date(order.createdAt).toLocaleString()} · {formatCollectionTime(order.collectionTime)}</p><ul>{order.lines.map((line,i)=><li key={i}><span>{line.quantity} × {line.name}{line.note&&<small className="fond-line-note"> · {line.note}</small>}</span><span>R{(line.subtotalCents/100).toFixed(2)}</span></li>)}</ul><div className={styles.orderTotal}><strong>R{(order.totalCents/100).toFixed(2)}</strong><span>{order.totalCents===0?'Coffee reward':order.payment?.paidCents>=order.totalCents?'Paid':'Payment due or pending'}</span></div>{order.lines.every(l=>l.id)&&<Link className={styles.primary} href={`/fond/menu?reorder=${encodeURIComponent(order.reference)}`}>Order again <ArrowRight size={16}/></Link>}</article>)}</div>:historyLoaded?<section className={`${styles.card} ${styles.empty}`}><ShoppingBag size={30} aria-hidden="true"/><h2>Your next favourite is waiting.</h2><p>No orders are linked to this account yet. Guest orders using the same email appear after you verify it.</p><Link className={styles.primary} href="/fond/menu">Explore the menu <ArrowRight size={17} aria-hidden="true"/></Link></section>:<p role="status">Your order history could not be loaded. Please try Refresh orders.</p>}
      <p className={styles.hint}>Your latest 100 orders include signed-in purchases and guest orders sent to your verified email. Orders placed with another email or without an email can still be tracked from the menu using their reference.</p>
     </>}
    </>:<AccountAccess onSignedIn={refresh}/>}
   </div>
   <aside className={styles.aside} aria-label="Coffee rewards promotion">
    <div className={styles.promo}>{counterEnabled?<div className="counter-promo-art"><Coffee size={68}/><strong>BUY 10 COFFEES<br/>GET 1 FREE</strong><span>In the app or at FOND</span></div>:<img src="/promotions/coffee-rewards-banner.png" alt="Buy 10 coffees through the FOND app and get one free" width={2172} height={724}/>}<div className={styles.promoBody}><p className={styles.eyebrow}>YOUR COFFEE. WITH A LITTLE EXTRA.</p><h2>Ten coffees.<br/>One on us.</h2><p>{counterEnabled?"Earn on qualifying app purchases or show your membership QR when ordering at FOND.":"Earn a punch with every paid Coffee item ordered through your verified FOND account, once collected or delivered."}</p><div className={styles.promoSteps}><span><Coffee size={18} aria-hidden="true"/> {counterEnabled?"Order in the app or at FOND":"Order through the app"}</span><span><CheckCircle2 size={18} aria-hidden="true"/> Collect 10 coffee punches</span><span><ShieldCheck size={18} aria-hidden="true"/> Enjoy your next one free</span></div><Link className={styles.promoLink} href={view==='rewards'?'#customer-access':'/profile/rewards'}>{user?'View your coffee card':'Discover coffee rewards'}<ArrowRight size={17} aria-hidden="true"/></Link><small>Any one Coffee item. Extras charged separately. Redeem in the app or show your code to staff.</small></div></div>
    <p className={styles.asideNote}>Good food. Great coffee.<br/>A brighter Midpoint.</p>
   </aside>
  </div>
 <div className="fond-account-nav"><HubAppNav/></div></main>;
}
