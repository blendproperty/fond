'use client';
import { useEffect, useState, useRef } from 'react';
import { ArrowRight, Check, Clock3, Coffee, Leaf, MapPin, Minus, Plus, ShoppingBag, Truck, Utensils, X, Download, Search } from 'lucide-react';
import { money, quoteCart, lineKey, categories, type CartLine, type Category, type Meal } from '@/lib/menu';

import {CategoryNavigation} from './category-navigation';
import {InstallApp} from './install-app';
import {CustomerPromotions} from './promotions';
import { submissionKey, clearSubmission } from '@/lib/submission';

import type { TradingSettings,SiteContent } from '@/lib/management';


type Confirmation = { reference: string; displayReference:string; total: number; collection: string; fulfillment: Fulfillment;estimatedPrepMinutes:number };
type TrackedOrder = { payment?: {paidCents:number;checkout:string|null}; paymentMethod?:'yoco_online'|'pay_at_collection';fulfillment?:Fulfillment;reference: string;displayReference:string; status: string; totalCents: number; collectionTime: string;estimatedPrepMinutes:number;updatedAt:string;estimatedArrivalAt:string|null };
type Fulfillment = 'collection' | 'delivery';
type CustomerSession = { email: string };

function statusLabel(order:TrackedOrder){
  if(order.status==='ready')return order.fulfillment==='delivery'?'Ready for delivery — waiting for dispatch':'Ready for collection';
  if(order.status==='out_for_delivery')return 'Out for delivery';
  if(order.status==='completed')return order.fulfillment==='delivery'?'Delivered':'Collected';
  return ({received:'Received — waiting for FOND to accept',accepted:'Accepted — being prepared',preparing:'Preparing in the kitchen',cancelled:'Cancelled'} as Record<string,string>)[order.status]??order.status;
}
function timingLabel(order:TrackedOrder){
  if(order.status==='out_for_delivery'&&order.estimatedArrivalAt)return `Expected by ${new Date(order.estimatedArrivalAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}`;
  if(order.status==='ready')return order.fulfillment==='delivery'?'Your order is packed; the delivery ETA starts when it leaves FOND.':`Ready now · ${order.collectionTime}`;
  if(['completed','cancelled'].includes(order.status))return order.fulfillment==='delivery'?'Delivery update':'Collection update';
  return `${order.collectionTime} · approx. ${order.estimatedPrepMinutes} min preparation`;
}

export function OrderingApp() {
  const [store,setStore]=useState<{settings:TradingSettings;content:SiteContent;open:boolean;onlinePayments:boolean;paymentMode?:'live'|'sandbox'|'none'}|null>(null);
  useEffect(()=>{const timer=setInterval(()=>{fetch('/api/store').then(r=>r.json()).then(setStore).catch(()=>{});},60000);return()=>clearInterval(timer);},[]);
  const [installHelp,setInstallHelp]=useState(false);
  const [payOnline,setPayOnline]=useState(false);
  const [paymentError,setPaymentError]=useState('');
  const [paying,setPaying]=useState(false);
  const [menu, setMenu] = useState<Meal[]>([]);
  const [category, setCategory] = useState<Category>(categories[0]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pendingMods, setPendingMods] = useState<Record<string, string[]>>({});
  const [panel, setPanel] = useState<'basket' | 'track' | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>('collection');
  const [collection, setCollection] = useState('As soon as possible');
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [company, setCompany] = useState('');
  const [building, setBuilding] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [note, setNote] = useState('');
  const [placedReferences, setPlacedReferences] = useState<{lookup:string;label:string}[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);

  const [offline, setOffline] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [tracked, setTracked] = useState<TrackedOrder | null>(null);
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    fetch('/api/store').then(r=>r.json()).then(data=>{setStore(data);setCollection(data.settings.collectionSlots[0]);if(!data.settings.collectionEnabled&&data.settings.deliveryEnabled)setFulfillment('delivery');}).catch(()=>{});
    fetch('/api/auth/session').then(r=>r.json()).then(data=>{const user=data.user as CustomerSession|null;if(user?.email)setCustomerEmail(user.email);setEmailOptIn(true);}).catch(()=>setEmailOptIn(true));

    const params=new URLSearchParams(location.search);if(params.has('payment')&&params.get('reference')){setPanel('track');setTrackInput(params.get('reference')!);void lookupOrder(params.get('reference')!);}
    fetch('/api/menu').then((r) => r.json()).then((data) => setMenu(data.menu ?? [])).catch(() => {});
  }, []);

  useEffect(()=>{if(store?.settings.whatsappEnabled===false)setWhatsappOptIn(false);},[store?.settings.whatsappEnabled]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    const connectivity = () => setOffline(!navigator.onLine);
    window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity); connectivity();
    return () => { window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); };
  }, []);

  useEffect(() => {
    if (!panel) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
      if (e.key === 'Tab') {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled), [role="dialog"] select, [role="dialog"] input, [role="dialog"] a[href]'));
        const first = elements[0], last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', close);
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = previous; previousFocus?.focus(); };
  }, [panel]);

  const count = cart.reduce((n, l) => n + l.quantity, 0);
  // Safe pricing for live UI totals: quoteCart throws on an empty or
  // momentarily-invalid basket (e.g. mid-edit), so wrap it rather than
  // reimplement modifier pricing here.
  function priceCart(lines: CartLine[]) {
    if (!lines.length) return [];
    try { return quoteCart(lines, menu); } catch { return []; }
  }
  const pricedCart = priceCart(cart);
  const total = pricedCart.reduce((n, l) => n + l.subtotal, 0);

  function toggleModifier(mealId: string, modifierId: string) {
    setPendingMods((current) => {
      const selected = current[mealId] ?? [];
      const next = selected.includes(modifierId) ? selected.filter((id) => id !== modifierId) : [...selected, modifierId];
      return { ...current, [mealId]: next };
    });
  }

  function change(id: string, delta: number, modifierIds?: string[]) {
    setConfirmation(null); setError('');
    setCart((current) => {
      const key = lineKey({ id, quantity: 1, modifierIds });
      const existing = current.find((l) => lineKey(l) === key);
      const qty = existing?.quantity ?? 0;
      const next = Math.max(0, Math.min(20, qty + delta));
      const rest = current.filter((l) => lineKey(l) !== key);
      return [...rest, ...(next ? [{ id, quantity: next, modifierIds: modifierIds?.length ? modifierIds : undefined }] : [])];
    });
  }

  function lineQuantity(mealId: string, modifierIds?: string[]) {
    const key = lineKey({ id: mealId, quantity: 1, modifierIds });
    return cart.find((l) => lineKey(l) === key)?.quantity ?? 0;
  }

  async function placeOrder() {
    if (sending.current) return;
    setError('');
    try {
      if (store && !store.open) throw new Error(store.settings.closedMessage);
      if (offline) throw new Error('Reconnect before continuing.');
      quoteCart(cart, menu);
      if (!customerName.trim()) throw new Error('Enter your name so FOND knows who this is for.');
      if (!contactNumber.trim()) throw new Error('Enter a contact number so FOND can reach you about your order.');
      const normalizedEmail=customerEmail.trim().toLowerCase();
      if(emailOptIn&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))throw new Error('Enter a valid email address for order updates, or turn email updates off.');
      if (fulfillment === 'delivery') {
        if (!building.trim()) throw new Error('Enter the building/office to deliver to.');
        if(!store?.onlinePayments)throw new Error('Delivery requires secure online payment, which is not available right now.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please check your basket.');
      return;
    }
    sending.current = true;
    setSubmitting(true);
    try {
      const paymentMethod=fulfillment==='delivery'||payOnline?'yoco_online':'pay_at_collection';
      const payload = JSON.stringify({lines:cart,collectionTime:collection,customerName,note,fulfillment,paymentMethod,contactNumber:contactNumber || null,company:company || null,building:building || null,customerEmail:customerEmail.trim()||null,whatsappOptIn:store?.settings.whatsappEnabled?whatsappOptIn:false,smsOptIn,emailOptIn});
      const key = await submissionKey(payload);
      const res = await fetch('/api/orders', {method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:payload});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not place that order.');
      clearSubmission(key);
      if(data.redirectUrl){location.assign(data.redirectUrl);return;}
      setConfirmation({ reference: data.reference, displayReference:data.displayReference, total: data.totalCents, collection, fulfillment,estimatedPrepMinutes:data.estimatedPrepMinutes });
      setPlacedReferences((current) => [{lookup:data.reference,label:data.displayReference}, ...current]);
      setCart([]);
      setNote('');
      if(payOnline)await pay(data.reference);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place that order. Please try again.');
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  async function pay(reference:string) {
    if(paying)return;
    setPaying(true);setPaymentError('');
    try{const r=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference})});const d=await r.json();if(!r.ok)throw new Error(d.message);location.assign(d.redirectUrl);}catch(e){setPaymentError((e as Error).message);}finally{setPaying(false);}
  }

  async function lookupOrder(reference: string) {
    setTrackError(''); setTracked(null);
    if (!reference.trim()) return;
    const res = await fetch(`/api/orders?reference=${encodeURIComponent(reference.trim())}`);
    const data = await res.json();
    if (!res.ok) { setTrackError(data.message ?? 'Order not found.'); return; }
    setTracked(data);
  }

  return <>
    <header className="header"><a href="/" className="wordmark" aria-label="FOND home">fond<span>.</span></a><div className="location"><MapPin size={16} /><div><strong>Midpoint Hub</strong><small>Collect from FOND</small></div></div><nav><a className="quiet" href="/account">My account</a><button className="quiet" onClick={() => { setPanel('track'); setTracked(null); setTrackError(''); }}><Search size={18} /> Track order</button><button className="basket-button" aria-label="Basket" onClick={() => setPanel('basket')}><ShoppingBag size={18} /><span>Basket</span><b>{count}</b></button></nav></header>
    <main id="main">
      <section className="hero"><img className="hero-bg" src="/images/fond-hero.jpg" alt="The FOND Eatery entrance at Midpoint Hub" loading="eager" /><div className="hero-copy"><p className="eyebrow"><span />YOUR EVERYDAY FOOD STOP</p><h1>{store?.content.headline??<>Good food.<br/>One less thing<br/><em>to think about.</em></>}</h1><p className="intro">{store?.content.intro??'From your first meeting to your last set. Fresh breakfast, proper lunch and a little lift. Made for your day at Midpoint.'}</p><a className="primary hero-cta" href="#menu">Find your favourite <ArrowRight size={18} /></a><div className="hero-foot"><Leaf size={16} /> Freshly made <span>·</span><ShoppingBag size={16} /> Order ahead, pay on collection</div></div><span className="hero-photo-caption">FOND · MIDPOINT HUB</span></section>
      <section className="promise"><span><Coffee size={20} /> Before work.</span><span><Utensils size={20} /> Between meetings.</span><span><Leaf size={20} /> After your workout.</span><strong>We&rsquo;ve got your day.</strong></section>
      {store?.content.announcement&&<div className="store-announcement">{store.content.announcement}</div>}
      {store&&!store.open&&<div role="status" className="store-announcement">{store.settings.closedMessage}</div>}
      {store?.paymentMode==='sandbox'&&<div role="status" className="sandbox-payment-banner"><strong>YOCO TEST PAYMENT MODE</strong><span>No real money will be charged. Orders and payment confirmations are for controlled FOND testing only.</span></div>}
      <InstallApp onHelpChange={setInstallHelp}/>
      <CustomerPromotions promotions={store?.content.promotions??[]} suspended={!!panel||!!confirmation||installHelp} onAction={target=>{if(target&&categories.includes(target as Category))setCategory(target as Category);document.getElementById('menu')?.scrollIntoView({behavior:'smooth'});}}/>
      <section id="menu" className="menu-section"><div className="section-top"><div><p className="eyebrow">SOMETHING GOOD, WHEN YOU NEED IT</p><h2>What are you in the mood for?</h2></div><div className="collection-badge"><Clock3 size={18} /><span>Order ahead.<br /><strong>Collect at Midpoint.</strong></span></div></div>
        <div className="menu-toolbar"><CategoryNavigation value={category} onChange={setCategory}/></div>
        <div className="meal-grid" role="tabpanel" aria-label={category}>{menu.filter((m) => m.category === category).map((m) => { const selectedMods = pendingMods[m.id] ?? []; const modPriceSum = (m.modifiers ?? []).filter((mod) => selectedMods.includes(mod.id)).reduce((n, mod) => n + mod.price, 0); const qty = lineQuantity(m.id, selectedMods); return <article className="meal-card" key={m.id}><div className="meal-art"><div className="food-symbol" aria-hidden="true">{m.symbol}</div>{(m.isSpecial || m.diet) && <span className="meal-tag">{m.isSpecial ? (m.specialLabel || 'Special') : m.diet!.join(' · ')}</span>}</div><div className="meal-content"><h3>{m.name}</h3><p>{m.description}</p>
          <p className="meal-prep">Approx. {Math.ceil((m.prepMinutes??10)*(1+(store?.settings.preparationWeightPercent??7)/100))} min preparation</p>{!!m.modifiers?.length && <div className="meal-modifiers">{m.modifiers.map((mod) => <label className="modifier-check" key={mod.id}><input type="checkbox" checked={selectedMods.includes(mod.id)} onChange={() => toggleModifier(m.id, mod.id)} /> {mod.name}{mod.price !== 0 ? ` (${mod.price > 0 ? '+' : ''}${money(mod.price)})` : ''}</label>)}</div>}
          <div className="meal-bottom"><strong>{money(m.price + modPriceSum)}{m.isSpecial && m.basePrice ? <span className="was-price"> {money(m.basePrice)}</span> : null}</strong><button className="add" aria-label={`Add ${m.name}`} onClick={() => change(m.id, 1, selectedMods)}><Plus size={18} /> Add{qty ? ` (${qty})` : ''}</button></div></div></article>; })}</div>
        <p className="allergen-note">Our food is prepared in an environment that handles gluten and nuts. Please let us know about any allergies when you collect.</p></section>

    </main>
    <footer><a className="wordmark" href="/">fond.</a><span>Good food. Everyday.</span><span>Midpoint Hub</span>{store?.settings.contactPhone&&<a href={`tel:${store.settings.contactPhone.replace(/[^+0-9]/g,'')}`}>{store.settings.contactPhone}</a>}</footer>
    {offline && <div className="offline" role="status">You&rsquo;re offline. Reconnect to continue.</div>}
    <button className="mobile-basket" aria-label="Basket" onClick={() => setPanel('basket')}><ShoppingBag size={18} /> View basket ({count}) <strong>{money(total)}</strong></button>
    {panel && <div className="overlay" onClick={() => setPanel(null)}><section className="drawer" role="dialog" aria-modal="true" aria-label={panel === 'basket' ? 'Your basket' : 'Track your order'} onClick={(e) => e.stopPropagation()}>
      <header><div><p className="eyebrow">FOND · MIDPOINT</p><h2>{panel === 'basket' ? 'Your basket' : 'Track your order'}</h2></div><button autoFocus className="icon-button" aria-label="Close" onClick={() => setPanel(null)}><X /></button></header>
      <div className="drawer-scroll">
        {panel === 'track' ? <>
          <label className="field">Order number<input value={trackInput} onChange={(e) => setTrackInput(e.target.value)} placeholder="FOND-7K3P-9Q8R" /></label>
          <button className="primary full" onClick={() => lookupOrder(trackInput)}><Search size={18} /> Check status</button>
          {trackError && <p role="alert">{trackError}</p>}
          {tracked && <div className="notice order-tracking-result" style={{ marginTop: 16 }}><span className="tracking-order-label">YOUR ORDER NUMBER</span><strong>{tracked.displayReference}</strong><p className="tracking-status">{statusLabel(tracked)}</p><p>{timingLabel(tracked)} · {money(tracked.totalCents)}</p><p>{(tracked.payment?.paidCents??0)>=tracked.totalCents?(store?.paymentMode==='sandbox'?"Paid in Yoco test mode":"Paid online"):tracked.paymentMethod==='yoco_online'?"Waiting for confirmed Yoco payment":"Payment due at collection"}</p><button className="quiet" onClick={()=>lookupOrder(tracked.reference)}>Refresh status</button>{store?.onlinePayments&&(tracked.payment?.paidCents??0)===0&&tracked.status!=="cancelled"&&<button className="primary" disabled={paying} onClick={()=>pay(tracked.reference)}>{store.paymentMode==='sandbox'?'Open Yoco TEST payment':'Pay securely with Yoco'}</button>}{paymentError&&<p role="alert">{paymentError}</p>}</div>}
          {placedReferences.length > 0 && <div style={{ marginTop: 24 }}><p className="small">Orders placed this visit</p>{placedReferences.map((order) => <button key={order.lookup} className="outline" style={{ marginTop: 8, marginRight: 8 }} onClick={() => lookupOrder(order.lookup)}>{order.label}</button>)}</div>}
        </> : confirmation ? <div className="confirmation"><span className="check"><Check /></span><h3>Order sent to FOND.</h3><p className="small">Quote this order number</p><p className="reference">{confirmation.displayReference}</p><p>{confirmation.fulfillment === 'delivery' ? 'Delivery' : confirmation.collection}</p><strong>{money(confirmation.total)}</strong><p>Estimated preparation: approximately {confirmation.estimatedPrepMinutes} minutes.</p><p className="notice">{confirmation.fulfillment==='delivery'?'Your secure payment and delivery status will appear in Track order.':'Payment is due at FOND when you collect. Staff will confirm the order and record it in the restaurant system.'}</p>{paymentError&&<p role="alert">{paymentError}</p>}<button className="primary" onClick={() => { setPanel(null); setConfirmation(null); }}>Back to the menu <ArrowRight size={18} /></button></div> : cart.length ? <>
          {pricedCart.map((l) => <div className="cart-line" key={lineKey({ id: l.id, quantity: l.quantity, modifierIds: l.selectedModifiers.map((mod) => mod.id) })}><span className="cart-art" aria-hidden="true">{l.symbol}</span><div><h3>{l.name}</h3><p>{money(l.unitPrice)}{l.selectedModifiers.length > 0 && <span className="cart-line-mods"> · {l.selectedModifiers.map((mod) => mod.name).join(', ')}</span>}</p><div className="quantity"><button aria-label={`Remove one ${l.name}`} onClick={() => change(l.id, -1, l.selectedModifiers.map((mod) => mod.id))}><Minus size={14} /></button><span>{l.quantity}</span><button disabled={l.quantity >= 20} aria-label={`Add one ${l.name}`} onClick={() => change(l.id, 1, l.selectedModifiers.map((mod) => mod.id))}><Plus size={14} /></button></div></div><strong>{money(l.subtotal)}</strong></div>)}
          <div className="fulfillment-toggle" role="tablist" aria-label="Collection or delivery">
            <button role="tab" aria-selected={fulfillment === 'collection'} disabled={store?.settings.collectionEnabled===false} onClick={() => setFulfillment('collection')}><ShoppingBag size={16} /> Collection</button>
            <button role="tab" aria-selected={fulfillment === 'delivery'} disabled={store?.settings.deliveryEnabled===false||!store?.onlinePayments} onClick={() => {setFulfillment('delivery');setPayOnline(true);}}><Truck size={16} /> Delivery</button>
          </div>
          <label className="field">Your name<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="So FOND knows who this is for" /></label>
          {fulfillment === 'collection' ? (
            <label className="field">Preferred collection<select value={collection} onChange={(e) => setCollection(e.target.value)}>{(store?.settings.collectionSlots??['As soon as possible','Breakfast collection','Lunch collection','After-work collection']).map(t=><option key={t}>{t}</option>)}</select></label>
          ) : <>
            <label className="field">Contact number<input required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="For FOND to reach you about your order" inputMode="tel" autoComplete="tel" /></label>
            <label className="field">Company (optional)<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Blend Property" /></label>
            <label className="field">Building / office<input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="e.g. OnPoint, 2nd floor" /></label>
          </>}
          {fulfillment==='collection'&&<label className="field">Contact number<input required value={contactNumber} onChange={e=>setContactNumber(e.target.value)} placeholder="For FOND to reach you about your order" inputMode="tel" autoComplete="tel"/></label>}
          <label className="field">Email address<input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="For receipts and order-ready updates" autoComplete="email" required={emailOptIn}/></label>
          {store?.settings.smsEnabled&&<label className="field-check"><input type="checkbox" checked={smsOptIn} onChange={e=>setSmsOptIn(e.target.checked)} disabled={!contactNumber.trim()}/> SMS me when my order is accepted and ready</label>}
          <label className="field-check"><input type="checkbox" checked={emailOptIn} onChange={e=>setEmailOptIn(e.target.checked)}/> Email me when my order is received and ready</label>
          <label className={`field-check${store?.settings.whatsappEnabled?'':' notification-unavailable'}`}><input type="checkbox" checked={whatsappOptIn} onChange={e=>setWhatsappOptIn(e.target.checked)} disabled={!contactNumber.trim()||!store?.settings.whatsappEnabled}/> {store?.settings.whatsappEnabled?'WhatsApp me when my order is accepted and ready':'WhatsApp notifications unavailable — setup pending'}</label>
          {store&&<p className="small">Allow approximately {store.settings.preparationMinutes} minutes. {fulfillment==='delivery'&&store.settings.deliveryArea}</p>}
          {store?.onlinePayments?<fieldset className="payment-choice"><legend>Payment</legend>{store.paymentMode==='sandbox'&&<p className="sandbox-payment-warning"><strong>Test checkout only.</strong> No real payment will be taken. FOND staff will see this as a test payment.</p>}<label className="field-check"><input type="radio" name="payment" checked={payOnline} onChange={()=>setPayOnline(true)}/> {store.paymentMode==='sandbox'?'Use Yoco TEST checkout':'Pay securely now with Yoco'}</label>{fulfillment==='collection'&&<label className="field-check"><input type="radio" name="payment" checked={!payOnline} onChange={()=>setPayOnline(false)}/> Pay at FOND when collecting</label>}{fulfillment==='delivery'&&<p className="small">Delivery orders must be paid online before FOND can prepare them.</p>}</fieldset>:<p className="notice">Online payment is currently unavailable. Collection orders can be paid at FOND. Delivery ordering will open when secure online payment is enabled.</p>}
          <label className="field">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergy, desk number, special request…" /></label>
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
          {error && <p role="alert">{error}</p>}
          <button className="primary full" disabled={offline || submitting || store?.open===false} onClick={placeOrder}>{submitting ? 'Sending…' : payOnline?(store?.paymentMode==='sandbox'?'Continue to Yoco TEST checkout':'Continue to secure payment'):'Send order to FOND'} <ArrowRight size={18} /></button>
          <p className="small center">{payOnline?(store?.paymentMode==='sandbox'?'Your test order moves forward only after Yoco confirms the test payment. No real money is charged.':'Your order moves forward only after Yoco confirms payment.'):'Payment will be due when you collect.'}</p>
        </> : <div className="empty"><ShoppingBag /><h3>A little something good?</h3><p>Your basket is waiting for its first favourite.</p><button className="primary" onClick={() => setPanel(null)}>Explore the menu <ArrowRight size={18} /></button></div>}
      </div>
    </section></div>}
  </>;
}
