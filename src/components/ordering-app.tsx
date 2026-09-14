'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Clock3, Coffee, Leaf, MapPin, Minus, Plus, ShoppingBag, Utensils, X, Download, Search } from 'lucide-react';
import { menu, money, quoteCart, categories, type CartLine, type Category } from '@/lib/menu';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Confirmation = { reference: string; total: number; collection: string };
type TrackedOrder = { reference: string; status: string; totalCents: number; collectionTime: string };

const STATUS_LABEL: Record<string, string> = {
  received: 'Received — waiting for FOND to accept',
  accepted: 'Accepted — being prepared',
  ready: 'Ready for collection',
  completed: 'Collected',
  cancelled: 'Cancelled',
};

export function OrderingApp() {
  const [category, setCategory] = useState<Category>(categories[0]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [panel, setPanel] = useState<'basket' | 'track' | null>(null);
  const [collection, setCollection] = useState('As soon as possible');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [placedReferences, setPlacedReferences] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [tracked, setTracked] = useState<TrackedOrder | null>(null);
  const [trackError, setTrackError] = useState('');

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const capture = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const connectivity = () => setOffline(!navigator.onLine);
    window.addEventListener('beforeinstallprompt', capture); window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity); connectivity();
    return () => { window.removeEventListener('beforeinstallprompt', capture); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); };
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
  const total = cart.reduce((n, l) => n + (menu.find((m) => m.id === l.id)?.price ?? 0) * l.quantity, 0);

  function change(id: string, delta: number) {
    setConfirmation(null); setError('');
    setCart((current) => {
      const qty = current.find((l) => l.id === id)?.quantity ?? 0;
      const next = Math.max(0, Math.min(20, qty + delta));
      return [...current.filter((l) => l.id !== id), ...(next ? [{ id, quantity: next }] : [])];
    });
  }

  async function placeOrder() {
    setError('');
    try {
      if (offline) throw new Error('Reconnect before continuing.');
      quoteCart(cart);
      if (!customerName.trim()) throw new Error('Enter your name so FOND knows who this is for.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please check your basket.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: cart, collectionTime: collection, customerName, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not place that order.');
      setConfirmation({ reference: data.reference, total: data.totalCents, collection });
      setPlacedReferences((current) => [data.reference, ...current]);
      setCart([]);
      setNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place that order. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
    <header className="header"><a href="/" className="wordmark" aria-label="FOND home">fond<span>.</span></a><div className="location"><MapPin size={16} /><div><strong>Midpoint Hub</strong><small>Collect from FOND</small></div></div><nav><button className="quiet" onClick={() => { setPanel('track'); setTracked(null); setTrackError(''); }}><Search size={18} /> Track order</button><button className="basket-button" aria-label="Basket" onClick={() => setPanel('basket')}><ShoppingBag size={18} /><span>Basket</span><b>{count}</b></button></nav></header>
    <main id="main">
      <section className="hero"><div className="hero-copy"><p className="eyebrow"><span />YOUR EVERYDAY FOOD STOP</p><h1>Good food.<br />One less thing<br /><em>to think about.</em></h1><p className="intro">From your first meeting to your last set.<br />Fresh breakfast, proper lunch and a little lift.<br />Made for your day at Midpoint.</p><a className="primary hero-cta" href="#menu">Find your favourite <ArrowRight size={18} /></a><div className="hero-foot"><Leaf size={16} /> Freshly made <span>·</span><ShoppingBag size={16} /> Order ahead, pay on collection</div></div>
        <div className="hero-art" aria-label="FOND Eatery at Midpoint Hub"><img src="/images/fond-hero.jpg" alt="The FOND Eatery entrance at Midpoint Hub" loading="eager" /><div className="art-label">a little<br /><i>everyday good.</i></div><span className="art-caption">FOND · MIDPOINT HUB</span></div></section>
      <section className="promise"><span><Coffee size={20} /> Before work.</span><span><Utensils size={20} /> Between meetings.</span><span><Leaf size={20} /> After your workout.</span><strong>We&rsquo;ve got your day.</strong></section>
      <section id="menu" className="menu-section"><div className="section-top"><div><p className="eyebrow">SOMETHING GOOD, WHEN YOU NEED IT</p><h2>What are you in the mood for?</h2></div><div className="collection-badge"><Clock3 size={18} /><span>Order ahead.<br /><strong>Collect at Midpoint.</strong></span></div></div>
        <div className="menu-toolbar"><div className="tabs scroll" role="tablist" aria-label="Menu category">{categories.map((c) => <button role="tab" aria-selected={category === c} key={c} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
        <div className="meal-grid" role="tabpanel" aria-label={category}>{menu.filter((m) => m.category === category).map((m) => <article className="meal-card" key={m.id}><div className="meal-art"><div className="food-symbol" aria-hidden="true">{m.symbol}</div>{m.diet && <span className="meal-tag">{m.diet.join(' · ')}</span>}</div><div className="meal-content"><h3>{m.name}</h3><p>{m.description}</p><div className="meal-bottom"><strong>{money(m.price)}</strong><button className="add" aria-label={`Add ${m.name}`} onClick={() => change(m.id, 1)}><Plus size={18} /> Add{cart.find((l) => l.id === m.id) ? ` (${cart.find((l) => l.id === m.id)!.quantity})` : ''}</button></div></div></article>)}</div>
        <p className="allergen-note">Our food is prepared in an environment that handles gluten and nuts. Please let us know about any allergies when you collect.</p></section>
      <section className="install"><div><h3>A little FOND on your phone.</h3><p>Add this to your home screen for easy access.</p></div>{install ? <button className="outline" onClick={async () => { await install.prompt(); await install.userChoice; setInstall(null); }}><Download size={17} /> Install FOND</button> : <p className="install-help">In your browser menu, choose &ldquo;Add to Home Screen&rdquo;<br />or &ldquo;Install app&rdquo;, if available.</p>}</section>
    </main>
    <footer><a className="wordmark" href="/">fond.</a><span>Good food. Everyday.</span><span>Midpoint Hub</span></footer>
    {offline && <div className="offline" role="status">You&rsquo;re offline. Reconnect to continue.</div>}
    <button className="mobile-basket" onClick={() => setPanel('basket')}><ShoppingBag size={18} /> View basket ({count}) <strong>{money(total)}</strong></button>
    {panel && <div className="overlay" onClick={() => setPanel(null)}><section className="drawer" role="dialog" aria-modal="true" aria-label={panel === 'basket' ? 'Your basket' : 'Track your order'} onClick={(e) => e.stopPropagation()}>
      <header><div><p className="eyebrow">FOND · MIDPOINT</p><h2>{panel === 'basket' ? 'Your basket' : 'Track your order'}</h2></div><button autoFocus className="icon-button" aria-label="Close" onClick={() => setPanel(null)}><X /></button></header>
      <div className="drawer-scroll">
        {panel === 'track' ? <>
          <label className="field">Order reference<input value={trackInput} onChange={(e) => setTrackInput(e.target.value)} placeholder="FOND-XXXXXX" /></label>
          <button className="primary full" onClick={() => lookupOrder(trackInput)}><Search size={18} /> Check status</button>
          {trackError && <p role="alert">{trackError}</p>}
          {tracked && <div className="notice" style={{ marginTop: 16 }}><strong>{tracked.reference}</strong><p>{STATUS_LABEL[tracked.status] ?? tracked.status}</p><p>{tracked.collectionTime} · {money(tracked.totalCents)}</p></div>}
          {placedReferences.length > 0 && <div style={{ marginTop: 24 }}><p className="small">Orders placed this visit</p>{placedReferences.map((ref) => <button key={ref} className="outline" style={{ marginTop: 8, marginRight: 8 }} onClick={() => lookupOrder(ref)}>{ref}</button>)}</div>}
        </> : confirmation ? <div className="confirmation"><span className="check"><Check /></span><h3>Order sent to FOND.</h3><p className="reference">{confirmation.reference}</p><p>{confirmation.collection}</p><strong>{money(confirmation.total)}</strong><p className="notice">Please pay at the counter on collection — this app doesn&rsquo;t take payment. FOND will accept your order shortly; use &ldquo;Track order&rdquo; to check its status.</p><button className="primary" onClick={() => { setPanel(null); setConfirmation(null); }}>Back to the menu <ArrowRight size={18} /></button></div> : cart.length ? <>
          {cart.map((l) => { const m = menu.find((m) => m.id === l.id)!; return <div className="cart-line" key={l.id}><span className="cart-art" aria-hidden="true">{m.symbol}</span><div><h3>{m.name}</h3><p>{money(m.price)}</p><div className="quantity"><button aria-label={`Remove one ${m.name}`} onClick={() => change(m.id, -1)}><Minus size={14} /></button><span>{l.quantity}</span><button disabled={l.quantity >= 20} aria-label={`Add one ${m.name}`} onClick={() => change(m.id, 1)}><Plus size={14} /></button></div></div><strong>{money(m.price * l.quantity)}</strong></div>; })}
          <label className="field">Your name<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="So FOND knows who this is for" /></label>
          <label className="field">Preferred collection<select value={collection} onChange={(e) => setCollection(e.target.value)}><option>As soon as possible</option><option>Breakfast collection</option><option>Lunch collection</option><option>After-work collection</option></select></label>
          <label className="field">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergy, desk number, special request…" /></label>
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
          {error && <p role="alert">{error}</p>}
          <button className="primary full" disabled={offline || submitting} onClick={placeOrder}>{submitting ? 'Sending…' : 'Send order to FOND'} <ArrowRight size={18} /></button>
          <p className="small center">No payment required now. Please pay at the counter on collection.</p>
        </> : <div className="empty"><ShoppingBag /><h3>A little something good?</h3><p>Your basket is waiting for its first favourite.</p><button className="primary" onClick={() => setPanel(null)}>Explore the menu <ArrowRight size={18} /></button></div>}
      </div>
    </section></div>}
  </>;
}
