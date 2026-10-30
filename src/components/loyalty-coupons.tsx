'use client';
import {useEffect,useState} from 'react';
type Terms={percent:number;amountCents:number;validDays:number};
type Settings=Terms&{enabled:boolean;days:number};
type Coupon={id:string;code:string;recipient_email:string;kind:string;status:string;reason:string;expires_at:string;email_preview:string};
type Data={testingEnabled:boolean;settings:Settings;coupons:Coupon[]};
type Recipient={email:string;verified:boolean};
const reasons=['Customer appreciation','Frequent customer reward','Service recovery','Promotion','Birthday / special occasion','Testing','Other'];
export function LoyaltyCoupons(){
 const [data,setData]=useState<Data|null>(null),[settings,setSettings]=useState<Settings|null>(null),[gift,setGift]=useState<Terms>({percent:10,amountCents:0,validDays:30}),[emails,setEmails]=useState(''),[reason,setReason]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[key,setKey]=useState('');
 const [query,setQuery]=useState(''),[recipients,setRecipients]=useState<Recipient[]>([]),[selected,setSelected]=useState<string[]>([]),[hasMore,setHasMore]=useState(false),[searching,setSearching]=useState(true),[searchError,setSearchError]=useState(''),[otherReason,setOtherReason]=useState('');
 async function load(){const r=await fetch('/api/admin/coupons',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.message);setData(d);setSettings(d.settings);}
 useEffect(()=>{setKey(crypto.randomUUID());void load().catch(e=>setMessage(e.message));},[]);
 useEffect(()=>{
  const controller=new AbortController();setSearching(true);setSearchError('');
  const timer=setTimeout(async()=>{try{const r=await fetch('/api/admin/coupons?recipients='+encodeURIComponent(query),{cache:'no-store',signal:controller.signal}),d=await r.json();if(!r.ok)throw new Error(d.message);if(!controller.signal.aborted){setRecipients(d.recipients);setHasMore(d.hasMore);}}catch(e){if(!controller.signal.aborted)setSearchError((e as Error).message);}finally{if(!controller.signal.aborted)setSearching(false);}},250);
  return()=>{clearTimeout(timer);controller.abort();};
 },[query]);
 const recipientEmails=[...new Set([...selected,...emails.split(/[\s,;]+/).filter(Boolean)].map(email=>email.trim().toLowerCase()))];
 async function save(body:unknown){setBusy(true);setMessage('');try{const r=await fetch('/api/admin/coupons',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.message);if(d.rewards)setKey(crypto.randomUUID());await load();setMessage(d.rewards?'Test coupons created. Review their email previews below.':'Saved.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 function fields(value:Terms,change:(next:Terms)=>void,prefix:string){return <>
  <label className="field">{prefix} percentage<input type="number" min="0" max="100" step="1" required value={value.percent} onChange={e=>change({...value,percent:Number(e.target.value)})}/></label>
  <label className="field">{prefix} saving (Rand)<input type="number" min="0" max="1000" step="0.01" required value={value.amountCents/100} onChange={e=>change({...value,amountCents:Math.round(Number(e.target.value)*100)})}/></label>
  <label className="field">{prefix} validity (days)<input type="number" min="1" max="365" required value={value.validDays} onChange={e=>change({...value,validDays:Number(e.target.value)})}/></label></>;}
 return <section className="manage-card" aria-labelledby="loyalty-coupons-title"><h2 id="loyalty-coupons-title">Loyalty coupons · testing</h2>
  <p>Test coupons only. Email previews are saved; no coupon emails are sent. Percentage applies first, then the Rand saving, capped at basket value. Delivery is excluded. Verified recipients redeem once through a test app checkout.</p>
  {message&&<p role="status">{message}</p>}
  {!data||!settings?<p>Coupon settings unavailable until loaded.</p>:!data.testingEnabled?<p>Coupon testing is disabled in this environment.</p>:<>
   <form onSubmit={e=>{e.preventDefault();void save({action:'settings',...settings});}}><h3>Automated daily-purchase reward</h3>
    <label className="field-check"><input type="checkbox" checked={settings.enabled} onChange={e=>setSettings({...settings,enabled:e.target.checked})}/> Enable automated test coupons</label>
    <p>One qualifying day per Johannesburg calendar day, from completed and fully paid app orders. A missed day resets the streak. New rule settings start a new test period. Turning automation off stops new coupons; issued coupons remain usable until expiry or revocation.</p>
    <label className="field">Consecutive purchase days<input type="number" min="2" max="90" required value={settings.days} onChange={e=>setSettings({...settings,days:Number(e.target.value)})}/></label>
    {fields(settings,next=>setSettings({...settings,...next}),'Automated')}<button className="primary" disabled={busy}>Save coupon automation</button>
   </form>
   <form onSubmit={e=>{e.preventDefault();if(reason==='Other'&&!otherReason.trim()){setMessage('Enter an other reason.');return;}void save({action:'issue',...gift,emails:recipientEmails,reason:reason==='Other'?'Other: '+otherReason.trim():reason});}}><h3>Issue manual coupons</h3>
    <label className="field">Search app customer emails<input type="search" maxLength={100} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault();}} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search registered app accounts"/></label>
    <p>Choose one or more registered app customers. Email verification is required to redeem a coupon.</p>
    {searchError&&<p role="alert">{searchError}</p>}{searching&&<p aria-live="polite">Searching app accounts…</p>}
    <fieldset className="loyalty-recipient-list"><legend>App customer recipients</legend>{!searching&&!searchError&&!recipients.length&&<p>No matching app accounts.</p>}{recipients.map(r=><label className="field-check" key={r.email}><input type="checkbox" aria-label={'Select '+r.email} checked={selected.includes(r.email)} disabled={!selected.includes(r.email)&&selected.length>=50} onChange={e=>setSelected(current=>e.target.checked?[...current,r.email]:current.filter(email=>email!==r.email))}/><span>{r.email}<small>{r.verified?'Verified email':'Email not verified yet'}</small></span></label>)}</fieldset>
    {hasMore&&<p>Showing the first 50 matches. Refine your search to find another account.</p>}
    {!!selected.length&&<><p>Selected app customers: {selected.length}</p><ul className="loyalty-recipient-selected">{selected.map(email=><li key={email}><span>{email}</span><button type="button" className="quiet" aria-label={'Remove '+email} onClick={()=>setSelected(current=>current.filter(value=>value!==email))}>Remove</button></li>)}</ul></>}
    <details><summary>Enter other email addresses</summary><label className="field">Additional recipient email addresses<textarea value={emails} onChange={e=>setEmails(e.target.value)} placeholder="Separate with commas or new lines"/></label></details>
    <p>Coupon recipients: {recipientEmails.length} / 50</p>
    <label className="field">Coupon reason<select required value={reason} onChange={e=>setReason(e.target.value)}><option value="" disabled>Select a reason</option>{reasons.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
    {reason==='Other'&&<label className="field">Other reason<input required maxLength={193} value={otherReason} onChange={e=>setOtherReason(e.target.value)}/></label>}
    {fields(gift,setGift,'Manual')}<button className="primary" disabled={busy||!recipientEmails.length||recipientEmails.length>50}>Create test coupons</button>
   </form>
   <h3>Coupon and email previews</h3><button className="quiet" disabled={busy} onClick={()=>void load().catch(e=>setMessage(e.message))}>Refresh coupons</button>
   {!data.coupons.length&&<p>No coupons issued yet.</p>}{data.coupons.map(c=><article className="reward-card" key={c.id}><strong>{c.recipient_email}</strong><p>{c.kind==='coupon-auto'?'Automated':'Manual'} · {c.status} · expires {new Date(c.expires_at).toLocaleDateString('en-ZA')}</p><p>Reason: {c.reason}</p><code>{c.code}</code><details><summary>Preview coupon email</summary><p>{c.email_preview}</p></details>{c.status==='available'&&<button className="quiet" disabled={busy} onClick={()=>void save({action:'revoke',id:c.id})}>Revoke unused coupon</button>}</article>)}
  </>}
 </section>;
}
