'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Check, ChefHat, Clock3, Lock, LogOut, Plus, Minus, Truck, X, ShoppingBag } from 'lucide-react';
import { categories, money, quoteCart, type CartLine, type Category, type Meal } from '@/lib/menu';

type OrderStatus = 'received' | 'accepted' | 'ready' | 'completed' | 'cancelled';
type StaffOrder = {
  id: string;
  reference: string;
  customerName: string;
  note: string | null;
  lines: CartLine[];
  collectionTime: string;
  totalCents: number;
  status: OrderStatus;
  source: 'customer' | 'staff';
  createdAt: string;
  fulfillment: 'collection' | 'delivery';
  contactNumber: string | null;
  company: string | null;
  building: string | null;
};

const NEXT_STEP: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  received: { label: 'Accept', next: 'accepted' },
  accepted: { label: 'Mark ready', next: 'ready' },
  ready: { label: 'Complete', next: 'completed' },
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
  const [loginError, setLoginError] = useState('');
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [menu, setMenu] = useState<Meal[]>([]);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    fetch('/api/menu').then((r) => r.json()).then((data) => setMenu(data.menu ?? [])).catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/staff/orders', { cache: 'no-store' });
    if (res.status === 401) {
      setLocked(true);
      return;
    }
    setLocked(false);
    const data = await res.json();
    setOrders(data.orders ?? []);
  }, []);

  useEffect(() => {
    refresh().finally(() => setChecking(false));
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setLoginError(data?.message ?? 'Incorrect code.');
      return;
    }
    setCode('');
    await refresh();
  }

  async function setStatus(id: string, status: OrderStatus) {
    setOrders((current) => current.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch(`/api/staff/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    refresh();
  }

  async function logout() {
    await fetch('/api/staff/logout', { method: 'POST' });
    setLocked(true);
  }

  const columns: { title: string; status: OrderStatus }[] = [
    { title: 'New', status: 'received' },
    { title: 'Preparing', status: 'accepted' },
    { title: 'Ready for collection', status: 'ready' },
  ];

  if (checking) return null;

  if (locked) {
    return (
      <div className="staff-lock">
        <form onSubmit={submitCode} className="staff-lock-card">
          <Lock size={28} />
          <h1>FOND staff tablet</h1>
          <p>Enter the facility access code to see the order queue.</p>
          <input autoFocus inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code" aria-label="Staff access code" />
          {loginError && <p role="alert" className="staff-error">{loginError}</p>}
          <button className="primary full" type="submit">Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div className="staff-app">
      <header className="staff-header">
        <div>
          <p className="eyebrow">FOND · FACILITY TABLET</p>
          <h1>Order queue</h1>
        </div>
        <div className="staff-header-actions">
          <button className="primary" onClick={() => setManualOpen(true)}><Plus size={18} /> Add order</button>
          <button className="icon-button" aria-label="Lock tablet" onClick={logout}><LogOut size={18} /></button>
        </div>
      </header>
      <div className="staff-columns">
        {columns.map((col) => (
          <section className="staff-column" key={col.status} aria-label={col.title}>
            <h2>{col.title} <span>{orders.filter((o) => o.status === col.status).length}</span></h2>
            {orders.filter((o) => o.status === col.status).length === 0 && <p className="staff-empty">Nothing here.</p>}
            {orders
              .filter((o) => o.status === col.status)
              .map((order) => {
                const step = NEXT_STEP[order.status];
                return (
                  <article className="staff-card" key={order.id}>
                    <div className="staff-card-top">
                      <strong>{order.customerName}</strong>
                      <span className="staff-ref">{order.reference}</span>
                    </div>
                    {order.fulfillment === 'delivery' ? (
                      <p className="staff-meta staff-delivery"><Truck size={14} /> Deliver to {order.building}{order.company ? ` · ${order.company}` : ''} · {order.contactNumber} · {timeAgo(order.createdAt)}</p>
                    ) : (
                      <p className="staff-meta"><Clock3 size={14} /> {order.collectionTime} · {timeAgo(order.createdAt)} {order.source === 'staff' && '· added by staff'}</p>
                    )}
                    <ul className="staff-lines">
                      {order.lines.map((line) => {
                        const item = menu.find((m) => m.id === line.id);
                        const mods = (line.modifierIds ?? []).map((mid) => item?.modifiers?.find((m) => m.id === mid)?.name).filter(Boolean);
                        return <li key={`${line.id}::${(line.modifierIds ?? []).join(',')}`}>{line.quantity}× {item?.name ?? line.id}{mods.length > 0 && <span className="staff-line-mods"> ({mods.join(', ')})</span>}</li>;
                      })}
                    </ul>
                    {order.note && <p className="staff-note">“{order.note}”</p>}
                    <div className="staff-card-bottom">
                      <strong>{money(order.totalCents)}</strong>
                      <div className="staff-card-actions">
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
  const [customerName, setCustomerName] = useState('');
  const [collectionTime, setCollectionTime] = useState('As soon as possible');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(() => cart.reduce((n, l) => n + (menu.find((m) => m.id === l.id)?.price ?? 0) * l.quantity, 0), [cart, menu]);

  function change(id: string, delta: number) {
    setCart((current) => {
      const qty = current.find((l) => l.id === id)?.quantity ?? 0;
      const next = Math.max(0, Math.min(20, qty + delta));
      return [...current.filter((l) => l.id !== id), ...(next ? [{ id, quantity: next }] : [])];
    });
  }

  async function submit() {
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
    setSubmitting(true);
    const res = await fetch('/api/staff/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName, collectionTime, note, lines: cart }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? 'Could not add that order.');
      return;
    }
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
            {menu.filter((m) => m.category === category).map((m) => (
              <button className="staff-item" key={m.id} onClick={() => change(m.id, 1)}>
                <span>{m.symbol}</span>
                <strong>{m.name}</strong>
                <em>{money(m.price)}</em>
                {cart.find((l) => l.id === m.id) && <b>{cart.find((l) => l.id === m.id)!.quantity}</b>}
              </button>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="staff-cart">
              <h3><ShoppingBag size={16} /> Basket</h3>
              {cart.map((l) => {
                const item = menu.find((m) => m.id === l.id)!;
                return (
                  <div className="cart-line" key={l.id}>
                    <div><h3>{item.name}</h3></div>
                    <div className="quantity">
                      <button aria-label={`Remove one ${item.name}`} onClick={() => change(l.id, -1)}><Minus size={14} /></button>
                      <span>{l.quantity}</span>
                      <button aria-label={`Add one ${item.name}`} onClick={() => change(l.id, 1)}><Plus size={14} /></button>
                    </div>
                    <strong>{money(item.price * l.quantity)}</strong>
                  </div>
                );
              })}
              <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
            </div>
          )}
          <label className="field">Name / table / desk<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Table 4, or Jane (OnPoint 2nd floor)" /></label>
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
