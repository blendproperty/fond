'use client';
import { useEffect, useState, useRef } from 'react';
import { ArrowRight, Check, Clock3, Coffee, Leaf, MapPin, Minus, Plus, ShoppingBag, Truck, Utensils, X, Download, Search } from 'lucide-react';
import { money, quoteCart, lineKey, categories, type CartLine, type Category, type Meal } from '@/lib/menu';

import {CategoryNavigation} from './category-navigation';
import {InstallApp} from './install-app';
import {CustomerPromotions} from './promotions';
import { submissionKey, clearSubmission } from '@/lib/submission';

import type { TradingSettings,SiteContent } from '@/lib/management';


type Confirmation = { reference: string; total: number; collection: string; fulfillment: Fulfillment };
type TrackedOrder = { payment?: {paidCents:number;checkout:string|null}; reference: string; status: string; totalCents: number; collectionTime: string };
type Fulfillment = 'collection' | 'delivery';

const STATUS_LABEL: Record<string, string> = {
  received: 'Received — waiting for FOND to accept',
  accepted: 'Accepted — being prepared',
  ready: 'Ready for collection',
  completed: 'Collected',
  cancelled: 'Cancelled',
};

export function OrderingApp() {
  const [store,setStore]=useState<{settings:TradingSettings;content:SiteContent;open:boolean;onlinePayments:boolean}|null>(null);
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
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [note, setNote] = useState('');
  const [placedReferences, setPlacedReferences] = useState<string[]>([]);
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

    const params=new URLSearchParams(location.search);if(params.has('payment')&&params.get('reference')){setPanel('track');setTrackInput(params.get('reference')!);void lookupOrder(params.get('reference')!);}
    fetch('/api/menu').then((r) => r.json()).then((data) => setMenu(data.menu ?? [])).catch(() => {});
  }, []);

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
      if (fulfillment === 'delivery') {
        if (!building.trim()) throw new Error('Enter the building/office to deliver to.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please check your basket.');
      return;
    }
    sending.current = true;
    setSubmitting(true);
    try {
      const payload = JSON.stringify({lines:cart,collectionTime:collection,customerName,note,fulfillment,contactNumber:contactNumber || null,company:company || null,building:building || null,whatsappOptIn});
      const key = await submissionKey(payload);
      const res = await fetch('/api/orders', {method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:payload});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not place that order.');
      clearSubmission(key);
      setConfirmation({ reference: data.reference, total: data.totalCents, collection, fulfillment });
      setPlacedReferences((current) => [data.reference, ...current]);
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
      <InstallApp onHelpChange={setInstallHelp}/>
      <CustomerPromotions promotions={store?.content.promotions??[]} suspended={!!panel||!!confirmation||installHelp} onAction={target=>{if(target&&categories.includes(target as Category))setCategory(target as Category);document.getElementById('menu')?.scrollIntoView({behavior:'smooth'});}}/>
      <section id="menu" className="menu-section"><div className="section-top"><div><p className="eyebrow">SOMETHING GOOD, WHEN YOU NEED IT</p><h2>What are you in the mood for?</h2></div><div className="collection-badge"><Clock3 size={18} /><span>Order ahead.<br /><strong>Collect at Midpoint.</strong></span></div></div>
        <div className="menu-toolbar"><CategoryNavigation value={category} onChange={setCategory}/></div>
        <div className="meal-grid" role="tabpanel" aria-label={category}>{menu.filter((m) => m.category === category).map((m) => { const selectedMods = pendingMods[m.id] ?? []; const modPriceSum = (m.modifiers ?? []).filter((mod) => selectedMods.includes(mod.id)).reduce((n, mod) => n + mod.price, 0); const qty = lineQuantity(m.id, selectedMods); return <article className="meal-card" key={m.id}><div className="meal-art"><div className="food-symbol" aria-hidden="true">{m.symbol}</div>{(m.isSpecial || m.diet) && <span className="meal-tag">{m.isSpecial ? (m.specialLabel || 'Special') : m.diet!.join(' · ')}</span>}</div><div className="meal-content"><h3>{m.name}</h3><p>{m.description}</p>
          {!!m.modifiers?.length && <div className="meal-modifiers">{m.modifiers.map((mod) => <label className="modifier-check" key={mod.id}><input type="checkbox" checked={selectedMods.includes(mod.id)} onChange={() => toggleModifier(m.id, mod.id)} /> {mod.name}{mod.price !== 0 ? ` (${mod.price > 0 ? '+' : ''}${money(mod.price)})` : ''}</label>)}</div>}
          <div className="meal-bottom"><strong>{money(m.price + modPriceSum)}{m.isSpecial && m.basePrice ? <span className="was-price"> {money(m.basePrice)}</span> : null}</strong><button className="add" aria-label={`Add ${m.name}`} onClick={() => change(m.id, 1, selectedMods)}><Plus size={18} /> Add{qty ? ` (${qty})` : ''}</button></div></div></article>; })}</div>
        <p className="allergen-note">Our food is prepared in an environment that handles gluten and nuts. Please let us know about any allergies when you collect.</p></section>

    </main>
    <footer><a className="wordmark" href="/">fond.</a><span>Good food. Everyday.</span><span>Midpoint Hub</span>{store?.settings.contactPhone&&<a href={`tel:${store.settings.contactPhone.replace(/[^+0-9]/g,'')}`}>{store.settings.contactPhone}</a>}</footer>
    {offline && <div className="offline" role="status">You&rsquo;re offline. Reconnect to continue.</div>}
    <button className="mobile-basket" onClick={() => setPanel('basket')}><ShoppingBag size={18} /> View basket ({count}) <strong>{money(total)}</strong></button>
    {panel && <div className="overlay" onClick={() => setPanel(null)}><section className="drawer" role="dialog" aria-modal="true" aria-label={panel === 'basket' ? 'Your basket' : 'Track your order'} onClick={(e) => e.stopPropagation()}>
      <header><div><p className="eyebrow">FOND · MIDPOINT</p><h2>{panel === 'basket' ? 'Your basket' : 'Track your order'}</h2></div><button autoFocus className="icon-button" aria-label="Close" onClick={() => setPanel(null)}><X /></button></header>
      <div className="drawer-scroll">
        {panel === 'track' ? <>
          <label className="field">Order reference<input value={trackInput} onChange={(e) => setTrackInput(e.target.value)} placeholder="FOND-XXXXXX" /></label>
          <button className="primary full" onClick={() => lookupOrder(trackInput)}><Search size={18} /> Check status</button>
          {trackError && <p role="alert">{trackError}</p>}
          {tracked && <div className="notice" style={{ marginTop: 16 }}><strong>{tracked.reference}</strong><p>{STATUS_LABEL[tracked.status] ?? tracked.status}</p><p>{tracked.collectionTime} · {money(tracked.totalCents)}</p><p>{(tracked.payment?.paidCents??0)>=tracked.totalCents?"Payment recorded":"Payment not yet confirmed"}</p><button className="quiet" onClick={()=>lookupOrder(tracked.reference)}>Refresh status</button>{store?.onlinePayments&&(tracked.payment?.paidCents??0)===0&&tracked.status!=="cancelled"&&<button className="primary" disabled={paying} onClick={()=>pay(tracked.reference)}>Pay with Yoco</button>}{paymentError&&<p role="alert">{paymentError}</p>}</div>}
          {placedReferences.length > 0 && <div style={{ marginTop: 24 }}><p className="small">Orders placed this visit</p>{placedReferences.map((ref) => <button key={ref} className="outline" style={{ marginTop: 8, marginRight: 8 }} onClick={() => lookupOrder(ref)}>{ref}</button>)}</div>}
        </> : confirmation ? <div className="confirmation"><span className="check"><Check /></span><h3>Order sent to FOND.</h3><p className="reference">{confirmation.reference}</p><p>{confirmation.fulfillment === 'delivery' ? 'Delivery' : confirmation.collection}</p><strong>{money(confirmation.total)}</strong><p className="notice">Pay at FOND, or use online checkout when available. Online payments are confirmed after verification. FOND will accept your order shortly; use &ldquo;Track order&rdquo; to check its status.</p>{store?.onlinePayments&&<button className="primary" disabled={paying} onClick={()=>pay(confirmation.reference)}>Pay with Yoco</button>}{paymentError&&<p role="alert">{paymentError}</p>}<button className="primary" onClick={() => { setPanel(null); setConfirmation(null); }}>Back to the menu <ArrowRight size={18} /></button></div> : cart.length ? <>
          {pricedCart.map((l) => <div className="cart-line" key={lineKey({ id: l.id, quantity: l.quantity, modifierIds: l.selectedModifiers.map((mod) => mod.id) })}><span className="cart-art" aria-hidden="true">{l.symbol}</span><div><h3>{l.name}</h3><p>{money(l.unitPrice)}{l.selectedModifiers.length > 0 && <span className="cart-line-mods"> · {l.selectedModifiers.map((mod) => mod.name).join(', ')}</span>}</p><div className="quantity"><button aria-label={`Remove one ${l.name}`} onClick={() => change(l.id, -1, l.selectedModifiers.map((mod) => mod.id))}><Minus size={14} /></button><span>{l.quantity}</span><button disabled={l.quantity >= 20} aria-label={`Add one ${l.name}`} onClick={() => change(l.id, 1, l.selectedModifiers.map((mod) => mod.id))}><Plus size={14} /></button></div></div><strong>{money(l.subtotal)}</strong></div>)}
          <div className="fulfillment-toggle" role="tablist" aria-label="Collection or delivery">
            <button role="tab" aria-selected={fulfillment === 'collection'} disabled={store?.settings.collectionEnabled===false} onClick={() => setFulfillment('collection')}><ShoppingBag size={16} /> Collection</button>
            <button role="tab" aria-selected={fulfillment === 'delivery'} disabled={store?.settings.deliveryEnabled===false} onClick={() => setFulfillment('delivery')}><Truck size={16} /> Delivery</button>
          </div>
          <label className="field">Your name<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="So FOND knows who this is for" /></label>
          {fulfillment === 'collection' ? (
            <label className="field">Preferred collection<select value={collection} onChange={(e) => setCollection(e.target.value)}>{(store?.settings.collectionSlots??['As soon as possible','Breakfast collection','Lunch collection','After-work collection']).map(t=><option key={t}>{t}</option>)}</select></label>
          ) : <>
            <label className="field">Contact number<input required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="For FOND to reach you about your order" inputMode="tel" autoComplete="tel" /></label>
            <label className="field">Company (optional)<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Blend Property" /></label>
            <label className="field">Building / office<input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="e.g. OnPoint, 2nd floor" /></label>
            <label className="field-check"><input type="checkbox" checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} disabled={!contactNumber.trim()} /> WhatsApp me when my order is accepted and ready</label>
          </>}
          {fulfillment==='collection'&&<label className="field">Contact number<input required value={contactNumber} onChange={e=>setContactNumber(e.target.value)} placeholder="For FOND to reach you about your order" inputMode="tel" autoComplete="tel"/></label>}
          {store&&<p className="small">Allow approximately {store.settings.preparationMinutes} minutes. {fulfillment==='delivery'&&store.settings.deliveryArea}</p>}
          {store?.onlinePayments&&<label className="field-check"><input type="checkbox" checked={payOnline} onChange={e=>setPayOnline(e.target.checked)}/> Pay online with Yoco after placing my order</label>}
          <label className="field">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergy, desk number, special request…" /></label>
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
          {error && <p role="alert">{error}</p>}
          <button className="primary full" disabled={offline || submitting || store?.open===false} onClick={placeOrder}>{submitting ? 'Sending…' : 'Send order to FOND'} <ArrowRight size={18} /></button>
          <p className="small center">Pay at FOND, or choose online payment when available.</p>
        </> : <div className="empty"><ShoppingBag /><h3>A little something good?</h3><p>Your basket is waiting for its first favourite.</p><button className="primary" onClick={() => setPanel(null)}>Explore the menu <ArrowRight size={18} /></button></div>}
      </div>
    </section></div>}
  </>;
}
