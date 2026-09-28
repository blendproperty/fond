'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,Coffee,Mail,ShieldCheck,ShoppingBag,CheckCircle2} from 'lucide-react';
import {CoffeeRewards} from './coffee-rewards';
import {BrandLogo} from './brand-logo';
import {formatCollectionTime} from '@/lib/fulfilment';
import styles from './customer-account.module.css';

type User={id:string;email:string;emailVerified:boolean};
type Order={reference:string;displayReference:string;status:string;createdAt:string;collectionTime:string;totalCents:number;lines:{name:string;quantity:number;subtotalCents:number}[];payment:{paidCents:number}};
export function CustomerAccount({view='orders'}:{view?:'orders'|'rewards'}){
 const [user,setUser]=useState<User|null>(null),[orders,setOrders]=useState<Order[]>([]),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[mode,setMode]=useState<'login'|'signup'>('login'),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[code,setCode]=useState(''),[verificationMessage,setVerificationMessage]=useState(''),[verificationError,setVerificationError]=useState(false),[verificationBusy,setVerificationBusy]=useState(false);
 async function refresh(){
  const response=await fetch('/api/auth/session',{cache:'no-store'});if(!response.ok)throw new Error('Could not load your account. Please try again.');const session=await response.json();setUser(session.user??null);
  if(session.user&&view==='orders'){const response=await fetch('/api/account/orders',{cache:'no-store'});if(!response.ok)throw new Error('Could not load your orders. Please try again.');const result=await response.json();setOrders(result.orders??[]);}else setOrders([]);
  setLoading(false);
 }
 useEffect(()=>{refresh().catch(e=>{setError(e.message);setLoading(false);});},[view]);
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
 async function submit(event:React.FormEvent){
  event.preventDefault();setError('');setBusy(true);
  try{const response=await fetch(`/api/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}),result=await response.json();if(!response.ok)throw new Error(result.message??'Could not sign in.');setPassword('');await refresh();}
  catch(e){setError(e instanceof Error?e.message:'Connection interrupted. Please try again.');}finally{setBusy(false);}
 }
 async function logout(){setBusy(true);setError('');try{const response=await fetch('/api/auth/logout',{method:'POST'});if(!response.ok)throw new Error('Could not sign out. Please try again.');setCode('');setVerificationMessage('');await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <main className={styles.page}>
  <header className={styles.header}><Link href="/" aria-label="Midpoint Cafe home" className={styles.brand}><BrandLogo/></Link><Link className={styles.back} href="/"><ArrowLeft size={17} aria-hidden="true"/> Back to menu</Link></header>
  <div className={styles.intro}><p className={styles.eyebrow}>A LITTLE MORE FOND OF EVERY DAY</p><h1>{view==='rewards'?'Coffee rewards':user?'Your orders':'Your daily FOND favourites.'}</h1><p>{user?'Your orders, your coffee rewards and your next little lift. All in one place.':'Good food, great coffee and something to look forward to. Make yourself at home.'}</p></div>
  <div className={styles.layout}>
   <div className={styles.content} id="customer-access">
    {loading?<section className={styles.card} aria-busy="true"><p role="status">Getting your account ready…</p></section>:user?<>
     <div className={styles.identity}><div><span>Signed in as {user.email}</span><small>{user.emailVerified?<><CheckCircle2 size={14} aria-hidden="true"/> Email verified</>:<><Mail size={14} aria-hidden="true"/> Email verification needed</>}</small></div><button className={styles.textButton} disabled={busy} onClick={logout}>Sign out</button></div>
     <nav className={styles.tabs} aria-label="Your account"><Link href="/account" aria-current={view==='orders'?'page':undefined}><ShoppingBag size={18} aria-hidden="true"/> Your orders</Link><Link href="/rewards" aria-current={view==='rewards'?'page':undefined}><Coffee size={18} aria-hidden="true"/> Coffee rewards</Link></nav>
     {error&&<p className={styles.error} role="alert">{error}</p>}
     {!user.emailVerified&&<section className={`${styles.card} ${styles.verification}`} aria-labelledby="verify-heading">
      <span className={styles.icon}><Mail size={26} aria-hidden="true"/></span><p className={styles.eyebrow}>ONE LAST STEP</p><h2 id="verify-heading">Verify your email</h2><p>Let's make this account yours. Confirm your email to start collecting coffee stamps and unlock your rewards.</p>
      <div className={styles.verifyStep}><span className={styles.stepNumber}>1</span><div><h3>Check your inbox</h3><p>We'll send a six-digit code to <strong>{user.email}</strong>.</p><button className={styles.secondary} disabled={verificationBusy} onClick={sendCode}>Send verification code</button></div></div>
      <form className={styles.verifyStep} onSubmit={confirmCode}><span className={styles.stepNumber}>2</span><div><h3>Make it official</h3><label className={styles.field}>Six digit code<input className={styles.codeInput} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" required/></label><button className={styles.primary} type="submit" disabled={verificationBusy||code.length!==6}>{verificationBusy?'Please wait…':'Verify email'}<ArrowRight size={17} aria-hidden="true"/></button></div></form>
      {verificationMessage&&<p className={verificationError?styles.error:styles.success} role={verificationError?'alert':'status'}>{verificationMessage}</p>}
      <p className={styles.hint}>Can't find the email? Check your spam folder, then request another code.</p>
     </section>}
     {view==='rewards'?<CoffeeRewards key={String(user.emailVerified)}/>:<>
      {orders.length?<div className={styles.orders}>{orders.map(order=><article key={order.reference} className={`${styles.card} ${styles.order}`}><div className={styles.orderHeading}><h2>{order.displayReference}</h2><span>{order.status.replaceAll('_',' ')}</span></div><p>{new Date(order.createdAt).toLocaleString()} · {formatCollectionTime(order.collectionTime)}</p><ul>{order.lines.map((line,i)=><li key={i}><span>{line.quantity} × {line.name}</span><span>R{(line.subtotalCents/100).toFixed(2)}</span></li>)}</ul><div className={styles.orderTotal}><strong>R{(order.totalCents/100).toFixed(2)}</strong><span>{order.totalCents===0?'Coffee reward':order.payment?.paidCents>=order.totalCents?'Paid':'Payment due or pending'}</span></div></article>)}</div>:<section className={`${styles.card} ${styles.empty}`}><ShoppingBag size={30} aria-hidden="true"/><h2>Your next favourite is waiting.</h2><p>You have not placed an order while signed in yet. Start with a coffee, breakfast or a little lunchtime lift.</p><Link className={styles.primary} href="/">Explore the menu <ArrowRight size={17} aria-hidden="true"/></Link></section>}
      <p className={styles.hint}>Orders linked to your account appear here. Guest orders can be tracked from the menu using their order reference.</p>
     </>}
    </>:<section className={`${styles.card} ${styles.auth}`}>
     <span className={styles.icon}>{mode==='login'?<Coffee size={27} aria-hidden="true"/>:<ShieldCheck size={27} aria-hidden="true"/>}</span><p className={styles.eyebrow}>{mode==='login'?'WELCOME BACK':'PULL UP A CHAIR'}</p><h2>{mode==='login'?'Sign in':'Create an account'}</h2><p>{mode==='login'?'Your favourites and coffee rewards are just a sign-in away.':'A free account for your orders, your coffee card and a little extra to look forward to.'}</p>
     <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com"/></label>
      <label className={styles.field}>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} autoComplete={mode==='signup'?'new-password':'current-password'} aria-describedby={mode==='signup'?'password-help':undefined}/></label>
      {mode==='signup'&&<p id="password-help" className={styles.hint}>Choose at least 8 characters. We'll help you verify your email next.</p>}
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      <button className={styles.primary} type="submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}<ArrowRight size={17} aria-hidden="true"/></button>
     </form>
     <div className={styles.switchMode}><span>{mode==='login'?'First time at FOND?':'Already part of the FOND family?'}</span><button className={styles.secondary} disabled={busy} type="button" onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>{mode==='login'?'Create an account':'Already have an account?'}</button></div>
     <p className={styles.hint}>Use your customer email and password. Your staff/admin login is separate.</p>
    </section>}
   </div>
   <aside className={styles.aside} aria-label="Coffee rewards promotion">
    <div className={styles.promo}><img src="/promotions/coffee-rewards-banner.png" alt="Buy 10 coffees through the FOND app and get one free" width={2172} height={724}/><div className={styles.promoBody}><p className={styles.eyebrow}>YOUR COFFEE. WITH A LITTLE EXTRA.</p><h2>Ten coffees.<br/>One on us.</h2><p>Earn a punch with every paid Coffee item ordered through your verified FOND account, once collected or delivered.</p><div className={styles.promoSteps}><span><Coffee size={18} aria-hidden="true"/> Order through the app</span><span><CheckCircle2 size={18} aria-hidden="true"/> Collect 10 coffee punches</span><span><ShieldCheck size={18} aria-hidden="true"/> Enjoy your next one free</span></div><Link className={styles.promoLink} href={view==='rewards'?'#customer-access':'/rewards'}>{user?'View your coffee card':'Discover coffee rewards'}<ArrowRight size={17} aria-hidden="true"/></Link><small>Any one Coffee item. Extras charged separately. Redeem in the app or show your code to staff.</small></div></div>
    <p className={styles.asideNote}>Good food. Great coffee.<br/>A brighter Midpoint.</p>
   </aside>
  </div>
 </main>;
}
