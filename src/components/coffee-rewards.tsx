'use client';
import {useEffect,useRef,useState} from 'react';
import {Coffee,Check,Ticket,X} from 'lucide-react';
type Reward={id:string;code:string;status:string;kind:string};
type RewardsData={verified:boolean;environment:string;stamps:number;stampsToNext:number;rewards:Reward[]};
export function CoffeeRewards(){
 const [data,setData]=useState<RewardsData|null>(null),[email,setEmail]=useState(false),[sms,setSms]=useState(false),[phone,setPhone]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[shown,setShown]=useState<string|null>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 async function load(preferences=false){
  const r=await fetch('/api/account/rewards',{cache:'no-store'});if(!r.ok)throw new Error('Could not refresh your rewards. Please sign in again if your session has ended.');
  const d=await r.json();setData(d);setError('');
  if(preferences){setEmail(!!d.preferences?.email_enabled);setSms(!!d.preferences?.sms_enabled);setPhone(d.preferences?.phone??'');}
 }
 useEffect(()=>{let active=true;const refresh=()=>{if(active)load().catch(e=>setError(e.message));};load(true).catch(e=>setError(e.message));const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);};},[]);
 useEffect(()=>{if(shown)dialog.current?.showModal();else dialog.current?.close();},[shown]);
 const visibleReward=data?.rewards?.find(r=>r.id===shown);
 async function send(rewardId:string){setBusy(true);try{const r=await fetch('/api/account/rewards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',rewardId})});const d=await r.json();setMessage(r.ok?'Code delivery requested using your saved preferences. Previously submitted codes are not sent twice.':d.message);}catch{setMessage('Could not request code delivery.');}finally{setBusy(false);}}
 async function save(){setBusy(true);try{const r=await fetch('/api/account/rewards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preferences',email,sms,phone})});const d=await r.json();if(!r.ok)throw new Error(d.message);setMessage('Reward notification preferences saved.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 const earnedReady=data?.rewards?.some(r=>r.kind==='earned'&&r.status==='available')??false;
 const punched=earnedReady?10:Math.min(10,data?.stamps??0);
 return <section className="coffee-rewards customer-rewards">
  {error&&<p role="alert">{error} <button className="quiet" onClick={()=>load().catch(e=>setError(e.message))}>Try again</button></p>}
  {!data?<p>Loading your coffee card…</p>:!data.verified?<p>Verify your account email above to start earning and redeeming rewards.</p>:<>
   <div className="coffee-ticket" aria-label="Coffee punch card">
    <div className="ticket-top"><span className="eyebrow">YOUR DAILY LITTLE LIFT</span><Coffee size={35} aria-hidden="true"/><h2>Good coffee.<br/>Great rewards.</h2><p>Buy 10 through the app.<br/>Your next one is on us.</p></div>
    <ol className="coffee-punches" aria-label={`${punched} of 10 coffees punched`}>
     {Array.from({length:10},(_,i)=><li key={i} className={i<punched?'is-punched':''} aria-label={`Coffee ${i+1}: ${i<punched?'collected':'still to collect'}`}><span className="punch-circle">{i<punched?<Check size={22} aria-hidden="true"/>:<Coffee size={27} aria-hidden="true"/>}</span><span className="punch-number">{String(i+1).padStart(2,'0')}</span></li>)}
    </ol>
    <div className={`ticket-free ${earnedReady?'is-unlocked':''}`}><Coffee size={36} aria-hidden="true"/><strong>{earnedReady?'FREE':'YOUR FREE COFFEE'}</strong><span>{earnedReady?'Your reward is ready below':`${data.stampsToNext} more ${data.stampsToNext===1?'coffee':'coffees'} to go`}</span></div>
    <p className="ticket-progress">{earnedReady?'Next card: ':''}{data.stamps} / 10 stamps · {data.stampsToNext} coffees to your next reward</p>
    {earnedReady&&<p className="ticket-next">This card is complete. New purchases count towards your next card.</p>}
   </div>
   {data.environment==='test'&&<p className="reward-test-label">TEST CARD · Test stamps and codes cannot be used for live payments.</p>}
   <p className="reward-rules">Earn one punch for each paid Coffee item ordered while signed in with a verified email, once collected or delivered. Earning is through the FOND app only. Counter purchases do not earn punches.</p>
   <h3>Your free coffees</h3>
   {!data.rewards.some(r=>r.status==='available'||r.status==='reserved')&&<p>Your unique code will appear here when you earn a reward or receive a gift.</p>}
   {data.rewards.map(r=><div className="reward-card" key={r.id}><div className="reward-card-heading"><Ticket aria-hidden="true"/><strong>{r.kind==='gift'?'Gift coffee':'Earned coffee'}</strong><span>{r.status==='available'?'Ready to use':r.status}</span></div>{r.status==='available'&&<><code>{r.code}</code><button className="primary" onClick={()=>setShown(r.id)}>Show code to staff</button><button className="outline" onClick={()=>navigator.clipboard.writeText(r.code).then(()=>setMessage('Code copied. Paste it into your basket.')).catch(()=>setMessage('Select and copy the code above.'))}>Copy coffee code</button><button className="quiet" disabled={busy} onClick={()=>send(r.id)}>Email / SMS this code</button><a href="/">Use in an app order →</a></>}{r.status==='reserved'&&<small>Reserved on an order. Staff can cancel the order to release it.</small>}</div>)}
   <p className="reward-rules">Show your code to staff at FOND or apply it to your basket. Any one Coffee item; extras charged separately. One use per code and one code per order. In a basket with several coffees, the highest-priced base coffee is free.</p>
   <details className="reward-preferences"><summary>Email & SMS preferences</summary><h3>Send my new reward codes</h3><label className="field-check"><input type="checkbox" checked={email} onChange={e=>setEmail(e.target.checked)}/> Email me my earned coffee codes</label><label className="field-check"><input type="checkbox" checked={sms} onChange={e=>setSms(e.target.checked)}/> SMS me my earned coffee codes</label>{sms&&<label className="field">Mobile number for reward codes<input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="+27…"/></label>}<button className="outline" disabled={busy} onClick={save}>Save reward preferences</button></details>
  </>}
  {message&&<p role="status">{message}</p>}
  <dialog ref={dialog} className="reward-code-dialog" onCancel={()=>setShown(null)} onClose={()=>setShown(null)} aria-labelledby="reward-code-title">
   <button className="icon-button reward-code-close" aria-label="Close reward code" onClick={()=>setShown(null)}><X/></button><Coffee size={50} aria-hidden="true"/><p className="eyebrow">MIDPOINT CAFE · FOND</p><h2 id="reward-code-title">One free coffee</h2>
   {data?.environment==='test'&&<p className="reward-test-label">TEST CODE · NOT VALID FOR LIVE PAYMENT</p>}
   {!error&&visibleReward?.status==='available'?<><p>Show this screen to the FOND team.</p><code className="large-reward-code">{visibleReward.code}</code><p>Any one Coffee item.<br/>Extras charged separately.</p><small>Staff will validate this code and record your coffee. It can only be used once.</small></>:<p role="status">{error?'Connect and refresh your rewards before showing your code.':visibleReward?.status==='reserved'?'Your code is reserved on an order.':visibleReward?.status==='redeemed'?'This coffee has been redeemed. Enjoy!':'This code is no longer available.'}</p>}
   <button className="outline" onClick={()=>load().catch(e=>setError(e.message))}>Refresh code status</button>
  </dialog>
 </section>;
}
export function AdminCoffeeRewards(){
 const [data,setData]=useState<any>(null),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[reason,setReason]=useState(''),[emailEnabled,setEmailEnabled]=useState(true),[smsEnabled,setSmsEnabled]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[key,setKey]=useState('');
 async function load(){const r=await fetch('/api/admin/rewards',{cache:'no-store'});if(r.ok)setData(await r.json());}useEffect(()=>{void load();setKey(crypto.randomUUID());},[]);
 async function gift(){setBusy(true);try{const r=await fetch('/api/admin/rewards',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({action:'gift',email,phone,reason,emailEnabled,smsEnabled})}),d=await r.json();if(!r.ok)throw new Error(d.message);setMessage(`Gift code: ${d.code}. Delivery is queued where selected; check status below.`);setKey(crypto.randomUUID());setReason('');await load();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function revoke(id:string){setBusy(true);try{const r=await fetch('/api/admin/rewards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'revoke',id})}),d=await r.json();setMessage(r.ok?'Unused gift revoked.':d.message);await load();}catch{setMessage('Could not revoke gift.');}finally{setBusy(false);}}
 if(!data)return null;
 return <section className="manage-card coffee-rewards"><h2>Coffee rewards · app only</h2><p>Every 10 paid coffees completed through a verified customer account earns one free Coffee item. Extras remain payable. Gift codes are issued only by super admins. Recipients verify their account, then redeem in the app or show the code to staff.</p><strong>{data.environment==='test'?'TEST codes — not valid for live payment':'LIVE coffee rewards'}</strong><label className="field">Gift recipient email<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Gift reason<input maxLength={200} value={reason} onChange={e=>setReason(e.target.value)}/></label><label className="field-check"><input type="checkbox" checked={emailEnabled} onChange={e=>setEmailEnabled(e.target.checked)}/> Email this code</label><label className="field-check"><input type="checkbox" checked={smsEnabled} onChange={e=>setSmsEnabled(e.target.checked)}/> SMS this code</label>{smsEnabled&&<label className="field">Gift recipient mobile<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>}<button className="primary" disabled={busy||!email.trim()||!reason.trim()} onClick={gift}>Issue free-coffee gift code</button>{message&&<p role="status">{message}</p>}<button className="quiet" onClick={load}>Refresh reward log</button><h3>Recent rewards</h3>{data.rewards.map((r:any)=><p key={r.id}>{r.recipient_email} · {r.environment} · {r.kind} · {r.status} {r.kind==='gift'&&r.status==='available'&&<button className="quiet" disabled={busy} onClick={()=>revoke(r.id)}>Revoke unused gift</button>}</p>)}<h3>Code delivery</h3><p>Provider accepted means submitted to the provider, not confirmed at the recipient. Unconfirmed responses need provider review before any resend.</p>{data.messages.map((m:any,i:number)=><p key={i}>{m.channel} · {m.status} {m.error&&`· ${m.error}`}</p>)}<details><summary>Reward audit trail</summary>{data.events.map((e:any,i:number)=><p key={i}>{e.created_at} · {e.action} · {e.actor} · {e.detail}</p>)}</details></section>;
}
