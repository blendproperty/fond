'use client';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Check, ChefHat, ChevronLeft, ChevronRight, Clock3, Lock, LogOut, Plus, Minus, Truck, Volume2, VolumeX, X, ShoppingBag } from 'lucide-react';
import { categories, lineKey, money, quoteCart, type CartLine, type Category, type Meal } from '@/lib/menu';
import { DEFAULT_QUEUE_TARGETS, QUEUE_LANES, queueLane, laneTiming, type QueueTargets } from '@/lib/staff-queue';

import { submissionKey, clearSubmission } from '@/lib/submission';

type OrderStatus = 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
type StaffOrder = {
  payment?: {paidCents:number;checkout:string|null;checkoutUpdatedAt?:string|null};
  id: string;
  reference: string;
  customerName: string;
  note: string | null;
  lines: (CartLine & {name?: string; modifiers?: {name:string}[]})[];
  collectionTime: string;
  totalCents: number;
  status: OrderStatus;
  source: 'customer' | 'staff';
  createdAt: string;
  updatedAt: string;
  fulfillment: 'collection' | 'delivery';
  contactNumber: string | null;
  company: string | null;
  building: string | null;
  posRequired: boolean;
  posRecordedAt: string | null;
  posReference: string | null;
  estimatedPrepMinutes:number;
  paymentMethod:'yoco_online'|'pay_at_collection';
  paymentRequired:boolean;
};

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  return `${minutes} min ago`;
}

export function StaffTablet() {
  const [locked, setLocked] = useState(true);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState('');
  const [named,setNamed]=useState(false);
  const [username,setUsername]=useState('');
  const [loginError, setLoginError] = useState('');
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [menu, setMenu] = useState<Meal[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [queueError, setQueueError] = useState('');
  const seenOrders = useRef<Set<string> | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());
  const [queueTargets, setQueueTargets] = useState<QueueTargets>(DEFAULT_QUEUE_TARGETS);
  const [posOrderId, setPosOrderId] = useState<string | null>(null);
  const [posReference, setPosReference] = useState('');

  useEffect(() => {
    fetch('/api/menu').then((r) => r.json()).then((data) => setMenu(data.menu ?? [])).catch(() => {});
    fetch('/api/store').then(r=>r.json()).then(data=>{const s=data.settings??{};setQueueTargets({new:Number(s.newOrderMinutes)||5,payment:Number(s.paymentConfirmationMinutes)||10,yoco:Number(s.yocoEntryMinutes)||5,preparing:Number(s.preparationMinutes)||20,delivery:Number(s.readyDeliveryMinutes)||10,collection:Number(s.readyCollectionMinutes)||10});}).catch(()=>{});
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  }, []);

  function playOrderSound() {
    const context=audioRef.current;
    if (!context || context.state!=='running') return;
    [0,0.22].forEach((offset,index)=>{
      const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+offset;
      oscillator.type='sine';oscillator.frequency.value=index?660:880;
      gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(0.09,start+0.025);gain.gain.exponentialRampToValueAtTime(0.0001,start+0.18);
      oscillator.connect(gain).connect(context.destination);oscillator.start(start);oscillator.stop(start+0.19);
    });
  }

  async function toggleSound() {
    if (soundEnabled) {setSoundEnabled(false);await audioRef.current?.close();audioRef.current=null;return;}
    try {audioRef.current=new AudioContext();await audioRef.current.resume();setSoundEnabled(true);playOrderSound();}
    catch {setQueueError('This browser could not enable order sounds.');}
  }

  const refresh = useCallback(async () => {
    const res = await fetch('/api/staff/orders', { cache: 'no-store' });
    if (res.status === 401) {
      setLocked(true);
      return;
    }
    if (!res.ok) throw new Error('Queue unavailable');
    setQueueError('');
    setLocked(false);
    const data = await res.json();
    const current: StaffOrder[] = data.orders ?? [];
    const incoming=seenOrders.current ? current.filter(o=>o.status==='received'&&!seenOrders.current!.has(o.id)) : [];
    if (incoming.length && soundEnabled) playOrderSound();
    if (incoming.length && notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      incoming.forEach(o => new Notification('New FOND order', { body: `${o.customerName} · ${o.reference}` }));
    }
    seenOrders.current = new Set(current.map(o => o.id));
    setOrders(current);
  }, [notificationsEnabled,soundEnabled]);

  async function enableNotifications() {
    if (typeof Notification === 'undefined') { setQueueError('This device does not support browser notifications.'); return; }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
    if (permission !== 'granted') setQueueError('Allow notifications in this browser to see new orders.');
  }

  async function recordYoco(id: string) {
    try {
      const res = await fetch(`/api/staff/orders/${id}/pos-entry`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ posReference }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not record Yoco entry.');
      setPosOrderId(null); setPosReference('');
      await refresh();
    } catch (error) { setQueueError(error instanceof Error ? error.message : 'Could not record Yoco entry.'); }
  }

  useEffect(() => {
    refresh().catch(() => setQueueError('Cannot reach FOND. The queue may be out of date.')).finally(() => setChecking(false));
    const interval = setInterval(() => {refresh().catch(() => setQueueError('Connection lost. The queue may be out of date.'));}, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(named ? {username,password:code} : {code}) });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setLoginError(data?.message ?? 'Incorrect code.');
      return;
    }
    setCode('');
    await refresh();
  }

  async function setStatus(id: string, status: OrderStatus) {
    setQueueError('');
    try {
      const expectedStatus = orders.find(o => o.id === id)?.status;
      const res = await fetch(`/api/staff/orders/${id}`, {method:'PATCH', headers:{'Content-Type':'application/json'},body:JSON.stringify({status, expectedStatus})});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not update this order.');
      await refresh();
    } catch (error) { setQueueError(error instanceof Error ? error.message : 'Connection lost. Refresh before trying again.'); }
  }

  async function logout() {
    await fetch('/api/staff/logout', { method: 'POST' });
    setLocked(true);
  }

  if (checking) return null;

  if (locked) {
    return (
      <div className="staff-lock admin-login">
        <form onSubmit={submitCode} className="admin-login-card staff-login-card">
          <div className="admin-login-top"><span className="admin-login-wordmark">fond<span>.</span></span><span className="admin-login-badge">STAFF PORTAL</span></div>
          <div className="admin-login-icon"><Lock size={24} strokeWidth={1.8}/></div>
          <p className="admin-login-kicker">MIDPOINT HUB · FOND</p>
          <h1>Ready for service.</h1>
          <p className="admin-login-intro">Sign in to manage today's orders.</p>
          <label className="admin-login-mode"><input type="checkbox" checked={named} onChange={e=>{setNamed(e.target.checked);setCode('');setLoginError('');}}/> <span>Sign in with a named account</span></label>
          {named&&<label className="admin-login-field">Username<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" placeholder="Your username"/></label>}
          <label className="admin-login-field">{named?'Password':'Staff access code'}<input type="password" autoFocus value={code} onChange={(e) => setCode(e.target.value)} autoComplete={named?'current-password':'off'} placeholder={named?'Enter your password':'Enter the staff code'} aria-label={named?'Password':'Staff access code'} /></label>
          {loginError && <p role="alert" className="staff-error">{loginError}</p>}
          <button className="primary full admin-login-submit" type="submit">Open order queue</button>
          <p className="admin-login-foot">Private access for the FOND team.</p>
        </form>
      </div>
    );
  }

  return (
    <div className="staff-app">
      <header className="staff-header">
        <div>
          <p className="eyebrow">FOND · FACILITY TABLET</p>
          <h1>Order queue</h1>{queueError && <p role="alert">{queueError}</p>}
        </div>
        <div className="staff-header-actions">
          <button className="quiet" onClick={enableNotifications}>{notificationsEnabled ? 'Notifications on' : 'Enable order alerts'}</button>
          <button className="quiet staff-sound-button" onClick={() => void toggleSound()} aria-pressed={soundEnabled}>{soundEnabled ? <Volume2 size={17}/> : <VolumeX size={17}/>} {soundEnabled ? 'Sound on' : 'Enable sound'}</button>
          <button className="primary" onClick={() => setManualOpen(true)}><Plus size={18} /> Add order</button>
          <button className="icon-button" aria-label="Lock tablet" onClick={logout}><LogOut size={18} /></button>
        </div>
      </header>
      <div className="staff-queue-controls"><span>Slide to see all six stages</span><button type="button" aria-label="Previous order stages" onClick={() => queueRef.current?.scrollBy({left:-320,behavior:'smooth'})}><ChevronLeft size={19}/></button><button type="button" aria-label="Next order stages" onClick={() => queueRef.current?.scrollBy({left:320,behavior:'smooth'})}><ChevronRight size={19}/></button></div>
      <div className="staff-columns" ref={queueRef}>
        {QUEUE_LANES.map((col) => (
          <section className="staff-column" data-lane={col.key} key={col.key} aria-label={col.title}>
            <h2>{col.title} <span>{orders.filter((o) => queueLane(o) === col.key).length}</span></h2>
            {orders.filter((o) => queueLane(o) === col.key).length === 0 && <p className="staff-empty">Nothing here.</p>}
            {orders
              .filter((o) => queueLane(o) === col.key)
              .map((order) => {
                const timing = laneTiming(order, now, queueTargets);
                const step = order.status==='received' && col.key==='new' ? {next:'accepted' as const,label:'Accept order'} : order.status==='accepted' && (order.posRecordedAt || !order.posRequired) ? {next:'preparing' as const,label:'Start preparing'} : order.status==='preparing' ? {next:'ready' as const,label:order.fulfillment==='delivery'?'Ready for delivery':'Ready for collection'} : order.status==='ready' ? {next:'completed' as const,label:order.fulfillment==='delivery'?'Mark delivered':'Mark collected'} : null;
                return (
                  <article className="staff-card" data-delayed={timing.delayed} key={order.id}>
                    <div className="staff-card-top">
                      <strong>{order.customerName}</strong>
                      <span className="staff-ref">{order.reference}</span>
                    </div>
                    <div className="staff-timing"><span><Clock3 size={13}/> {timing.elapsedMinutes} min in stage · target {timing.targetMinutes} min{col.key==='preparing'?' · basket estimate':''}</span>{timing.delayed&&<strong className="staff-delayed" role="status">Delayed</strong>}</div>
                    {order.fulfillment === 'delivery' ? (
                      <p className="staff-meta staff-delivery"><Truck size={14} /> Deliver to {order.building}{order.company ? ` · ${order.company}` : ''} · {order.contactNumber} · {timeAgo(order.createdAt)}</p>
                    ) : (
                      <p className="staff-meta"><Clock3 size={14} /> {order.collectionTime} · {timeAgo(order.createdAt)} {order.source === 'staff' && '· added by staff'}</p>
                    )}
                    <ul className="staff-lines">
                      {order.lines.map((line) => {
                        const item = menu.find((m) => m.id === line.id);
                        const mods = line.modifiers?.map(m => m.name) ?? (line.modifierIds ?? []).map((mid) => item?.modifiers?.find((m) => m.id === mid)?.name).filter(Boolean);
                        return <li key={`${line.id}::${(line.modifierIds ?? []).join(',')}`}>{line.quantity}× {line.name ?? item?.name ?? line.id}{mods.length > 0 && <span className="staff-line-mods"> ({mods.join(', ')})</span>}</li>;
                      })}
                    </ul>
                    {order.note && <p className="staff-note">“{order.note}”</p>}
                    {order.posRecordedAt && <p className="staff-meta">Entered in Yoco · {order.posReference}</p>}
                    <p className="staff-meta"><strong>{order.paymentMethod==='yoco_online'?'PAY ONLINE':'PAY AT COLLECTION'}</strong></p>
                    {posOrderId === order.id && <form className="staff-pos-form" onSubmit={event => { event.preventDefault(); void recordYoco(order.id); }}><label className="field">Yoco order reference<input autoFocus required maxLength={100} value={posReference} onChange={event => setPosReference(event.target.value)} placeholder="Reference shown in the Yoco system"/></label><p>Confirm only after this order has been added to Yoco for kitchen printing.</p><button className="primary" type="submit">Confirm Yoco entry</button><button className="quiet" type="button" onClick={() => {setPosOrderId(null);setPosReference('');}}>Cancel</button></form>}
                    <div className="staff-card-bottom">
                      <strong>{money(order.totalCents)}</strong><span>{order.payment?.paidCents===order.totalCents ? "Paid online" : order.paymentRequired||order.payment?.checkout==='pending'||order.payment?.checkout==='creating' ? "Online payment required — do not prepare" : `Due at collection ${money(Math.max(0,order.totalCents-(order.payment?.paidCents??0)))}`}</span>
                      <div className="staff-card-actions">
                        {order.status === 'accepted' && order.posRequired && !order.posRecordedAt && posOrderId !== order.id && <button className="primary" onClick={() => {setPosOrderId(order.id);setPosReference('');}}>Record Yoco entry</button>}
                        {col.key==='payment' && <span className="staff-awaiting">Waiting for signed Yoco payment confirmation</span>}
                        {step && <button className="primary" onClick={() => setStatus(order.id, step.next)}><Check size={16} /> {step.label}</button>}
                        <button className="quiet" onClick={() => setStatus(order.id, 'cancelled')}>Cancel</button>
                      </div>
                    </div>
                  </article>
                );
              })}
          </section>
        ))}
      </div>
      {manualOpen && <ManualOrderPanel menu={menu} onClose={() => setManualOpen(false)} onCreated={refresh} />}
    </div>
  );
}

function ManualOrderPanel({ menu, onClose, onCreated }: { menu: Meal[]; onClose: () => void; onCreated: () => void }) {
  const [category, setCategory] = useState<Category>(categories[0]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pendingMods, setPendingMods] = useState<Record<string, string[]>>({});
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [collectionTime, setCollectionTime] = useState('As soon as possible');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);

  const pricedCart = useMemo(() => {
    try { return cart.length ? quoteCart(cart, menu) : []; } catch { return []; }
  }, [cart, menu]);
  const total = pricedCart.reduce((n, line) => n + line.subtotal, 0);

  function toggleModifier(itemId: string, modifierId: string) {
    setPendingMods(current => {
      const selected = current[itemId] ?? [];
      return {...current, [itemId]: selected.includes(modifierId) ? selected.filter(id => id !== modifierId) : [...selected, modifierId]};
    });
  }

  function change(id: string, delta: number, modifierIds: string[] = []) {
    setCart((current) => {
      const key = lineKey({id, quantity: 1, modifierIds});
      const qty = current.find((l) => lineKey(l) === key)?.quantity ?? 0;
      const next = Math.max(0, Math.min(20, qty + delta));
      return [...current.filter((l) => lineKey(l) !== key), ...(next ? [{ id, quantity: next, modifierIds }] : [])];
    });
  }

  async function submit() {
    if (sending.current) return;
    setError('');
    try {
      quoteCart(cart, menu);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add at least one item.');
      return;
    }
    if (!customerName.trim()) {
      setError('Enter a name or table/desk for this order.');
      return;
    }
    if (!contactNumber.trim()) {
      setError('Enter a contact number for this order.');
      return;
    }
    sending.current = true;
    setSubmitting(true);
    try {
      const payload = JSON.stringify({ customerName, contactNumber, collectionTime, note, lines: cart });
      const key = await submissionKey(payload);
      const res = await fetch('/api/staff/orders', {method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:payload});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not add that order.');
      clearSubmission(key);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection lost. Retry the same order safely.');
      return;
    } finally { sending.current = false; setSubmitting(false); }

    onCreated();
    onClose();
  }

  return (
    <div className="overlay" onClick={onClose}>
      <section className="drawer staff-manual" role="dialog" aria-modal="true" aria-label="Add order manually" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">FOND · FACILITY TABLET</p>
            <h2>Add order</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}><X /></button>
        </header>
        <div className="drawer-scroll">
          <div className="tabs" role="tablist" aria-label="Menu category">
            {categories.map((c) => (
              <button role="tab" aria-selected={category === c} key={c} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <div className="staff-item-grid" role="tabpanel" aria-label={category}>
            {menu.filter((m) => m.category === category).map((m) => {
              const selected = pendingMods[m.id] ?? [];
              const selectedPrice = (m.modifiers ?? []).filter(mod => selected.includes(mod.id)).reduce((sum, mod) => sum + mod.price, m.price);
              return <div className="staff-item" key={m.id}>
                <button className="staff-item-add" onClick={() => change(m.id, 1, selected)} aria-label={`Add ${m.name}`}>
                  <span>{m.symbol}</span><strong>{m.name}</strong><em>{money(selectedPrice)}</em>
                </button>
                {!!m.modifiers?.length && <div className="staff-item-modifiers">{m.modifiers.map(mod => <label key={mod.id}><input type="checkbox" checked={selected.includes(mod.id)} onChange={() => toggleModifier(m.id, mod.id)}/>{mod.name}{mod.price ? ` (+${money(mod.price)})` : ''}</label>)}</div>}
              </div>;
            })}
          </div>
          {cart.length > 0 && (
            <div className="staff-cart">
              <h3><ShoppingBag size={16} /> Basket</h3>
              {pricedCart.map((l) => {
                const modifiers = l.selectedModifiers.map(mod => mod.id);
                return (
                  <div className="cart-line" key={lineKey({id:l.id,quantity:l.quantity,modifierIds:modifiers})}>
                    <div><h3>{l.name}</h3>{l.selectedModifiers.length > 0 && <p>{l.selectedModifiers.map(mod => mod.name).join(', ')}</p>}</div>
                    <div className="quantity">
                      <button aria-label={`Remove one ${l.name}`} onClick={() => change(l.id, -1, modifiers)}><Minus size={14} /></button>
                      <span>{l.quantity}</span>
                      <button aria-label={`Add one ${l.name}`} onClick={() => change(l.id, 1, modifiers)}><Plus size={14} /></button>
                    </div>
                    <strong>{money(l.subtotal)}</strong>
                  </div>
                );
              })}
              <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
          )}
          <label className="field">Name / table / desk<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Table 4, or Jane (OnPoint 2nd floor)" /></label>
          <label className="field">Contact number<input required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="Customer's phone number" /></label>
          <label className="field">Collection time
            <select value={collectionTime} onChange={(e) => setCollectionTime(e.target.value)}>
              <option>As soon as possible</option>
              <option>Breakfast collection</option>
              <option>Lunch collection</option>
              <option>After-work collection</option>
            </select>
          </label>
          <label className="field">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergy, table number, special request…" /></label>
          {error && <p role="alert">{error}</p>}
          <button className="primary full" disabled={submitting} onClick={submit}><ChefHat size={18} /> {submitting ? 'Adding…' : 'Add to queue'}</button>
        </div>
      </section>
    </div>
  );
}
