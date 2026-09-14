'use client';
import { useCallback, useEffect, useState } from 'react';
import { Lock, LogOut, Plus, RefreshCw, Save, Sparkles, Trash2 } from 'lucide-react';
import { money, categories, type Category, type Meal } from '@/lib/menu';

type AdminOrder = {
  id: string;
  reference: string;
  customerName: string;
  status: string;
  fulfillment: 'collection' | 'delivery';
  totalCents: number;
  collectionTime: string;
  building: string | null;
  company: string | null;
  contactNumber: string | null;
  createdAt: string;
};

export function AdminPanel() {
  const [locked, setLocked] = useState(true);
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<'menu' | 'orders'>('menu');

  const check = useCallback(async () => {
    const res = await fetch('/api/admin/menu', { cache: 'no-store' });
    setLocked(res.status === 401);
  }, []);

  useEffect(() => { check().finally(() => setChecking(false)); }, [check]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setLoginError(data?.message ?? 'Incorrect code.');
      return;
    }
    setCode('');
    setLocked(false);
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setLocked(true);
  }

  if (checking) return null;

  if (locked) {
    return (
      <div className="staff-lock">
        <form onSubmit={submitCode} className="staff-lock-card">
          <Lock size={28} />
          <h1>FOND admin</h1>
          <p>Enter the admin access code to manage the menu and view orders.</p>
          <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Admin code" aria-label="Admin access code" />
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
          <p className="eyebrow">FOND · ADMIN</p>
          <h1>Run the business</h1>
        </div>
        <div className="staff-header-actions">
          <div className="tabs">
            <button aria-selected={tab === 'menu'} onClick={() => setTab('menu')}>Menu &amp; specials</button>
            <button aria-selected={tab === 'orders'} onClick={() => setTab('orders')}>Orders</button>
          </div>
          <button className="icon-button" aria-label="Log out" onClick={logout}><LogOut size={18} /></button>
        </div>
      </header>
      {tab === 'menu' ? <MenuAdmin /> : <OrdersAdmin />}
    </div>
  );
}

function MenuAdmin() {
  const [items, setItems] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: categories[0] as Category, price: '', description: '' });
  const [addError, setAddError] = useState('');

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/menu', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.menu ?? []);
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  async function patch(id: string, body: Record<string, unknown>) {
    setSavingId(id);
    setItems((current) => current.map((m) => (m.id === id ? { ...m, ...(body as Partial<Meal>) } : m)));
    await fetch(`/api/admin/menu/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    await refresh();
    setSavingId(null);
  }

  async function remove(id: string) {
    if (!confirm('Remove this item from the menu?')) return;
    await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });
    refresh();
  }

  async function addItem() {
    setAddError('');
    const priceCents = Math.round(parseFloat(newItem.price) * 100);
    if (!newItem.name.trim() || !Number.isFinite(priceCents) || priceCents < 0) {
      setAddError('Enter a name and a valid price.');
      return;
    }
    const res = await fetch('/api/admin/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: newItem.name, name: newItem.name, category: newItem.category, price: priceCents, description: newItem.description }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setAddError(data?.message ?? 'Could not add that item.');
      return;
    }
    setNewItem({ name: '', category: categories[0], price: '', description: '' });
    setAdding(false);
    refresh();
  }

  if (loading) return <p className="staff-empty">Loading menu…</p>;

  return (
    <div>
      <div className="admin-toolbar">
        <button className="primary" onClick={() => setAdding((v) => !v)}><Plus size={16} /> {adding ? 'Cancel' : 'Add item / special'}</button>
        <button className="quiet" onClick={refresh}><RefreshCw size={16} /> Refresh</button>
      </div>
      {adding && (
        <div className="admin-add-card">
          <label className="field">Name<input value={newItem.name} onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))} placeholder="e.g. Winter Toastie Special" /></label>
          <label className="field">Category<select value={newItem.category} onChange={(e) => setNewItem((n) => ({ ...n, category: e.target.value as Category }))}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="field">Price (R)<input value={newItem.price} onChange={(e) => setNewItem((n) => ({ ...n, price: e.target.value }))} placeholder="65.00" inputMode="decimal" /></label>
          <label className="field">Description<input value={newItem.description} onChange={(e) => setNewItem((n) => ({ ...n, description: e.target.value }))} placeholder="Short description customers see" /></label>
          {addError && <p role="alert">{addError}</p>}
          <button className="primary" onClick={addItem}><Save size={16} /> Add to menu</button>
        </div>
      )}
      {categories.map((cat) => {
        const catItems = items.filter((m) => m.category === cat);
        if (!catItems.length) return null;
        return (
          <section key={cat} className="admin-category">
            <h2>{cat}</h2>
            {catItems.map((item) => (
              <MenuRow key={item.id} item={item} saving={savingId === item.id} onPatch={(body) => patch(item.id, body)} onRemove={() => remove(item.id)} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function MenuRow({ item, saving, onPatch, onRemove }: { item: Meal; saving: boolean; onPatch: (body: Record<string, unknown>) => void; onRemove: () => void }) {
  const [price, setPrice] = useState((item.basePrice ?? item.price) / 100 + '');
  const [specialPrice, setSpecialPrice] = useState(item.isSpecial && item.basePrice ? (item.price / 100 + '') : '');
  const [specialLabel, setSpecialLabel] = useState(item.specialLabel ?? '');

  return (
    <div className={`admin-row${item.available === false ? ' admin-row-off' : ''}`}>
      <div className="admin-row-main">
        <span className="admin-row-symbol">{item.symbol}</span>
        <div className="admin-row-name">
          <strong>{item.name}</strong>
          <span>{item.description}</span>
        </div>
        <label className="admin-price">R<input value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => onPatch({ price: Math.round(parseFloat(price || '0') * 100) })} inputMode="decimal" /></label>
        <label className="field-check"><input type="checkbox" checked={item.available !== false} onChange={(e) => onPatch({ available: e.target.checked })} /> On menu</label>
        <button className="icon-button" aria-label={`Remove ${item.name}`} onClick={onRemove}><Trash2 size={16} /></button>
      </div>
      <div className="admin-row-special">
        <label className="field-check"><input type="checkbox" checked={!!item.isSpecial} onChange={(e) => onPatch({ isSpecial: e.target.checked, specialPrice: e.target.checked ? Math.round(parseFloat(specialPrice || price) * 100) : null })} /> <Sparkles size={13} /> Special</label>
        {item.isSpecial && <>
          <label className="admin-price small">Special price R<input value={specialPrice} onChange={(e) => setSpecialPrice(e.target.value)} onBlur={() => onPatch({ specialPrice: Math.round(parseFloat(specialPrice || '0') * 100) })} inputMode="decimal" /></label>
          <input className="admin-special-label" value={specialLabel} onChange={(e) => setSpecialLabel(e.target.value)} onBlur={() => onPatch({ specialLabel: specialLabel || null })} placeholder="Badge text, e.g. 'This week only'" />
        </>}
      </div>
      {saving && <span className="admin-saving">Saving…</span>}
    </div>
  );
}

function OrdersAdmin() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState('');
  const [fulfillment, setFulfillment] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (fulfillment) params.set('fulfillment', fulfillment);
    if (query) params.set('q', query);
    const res = await fetch(`/api/admin/orders?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setOrders(data.orders ?? []);
  }, [status, fulfillment, query]);

  useEffect(() => { setLoading(true); refresh().finally(() => setLoading(false)); }, [refresh]);

  return (
    <div>
      <div className="admin-toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="received">Received</option>
          <option value="accepted">Accepted</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}>
          <option value="">Collection &amp; delivery</option>
          <option value="collection">Collection only</option>
          <option value="delivery">Delivery only</option>
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reference or name" />
        <button className="quiet" onClick={refresh}><RefreshCw size={16} /> Refresh</button>
      </div>
      {loading ? <p className="staff-empty">Loading orders…</p> : orders.length === 0 ? <p className="staff-empty">No orders match.</p> : (
        <div className="admin-orders-table">
          {orders.map((o) => (
            <div className="admin-order-row" key={o.id}>
              <span className="staff-ref">{o.reference}</span>
              <strong>{o.customerName}</strong>
              <span>{o.fulfillment === 'delivery' ? `Delivery · ${o.building ?? ''}` : o.collectionTime}</span>
              <span className={`admin-status admin-status-${o.status}`}>{o.status}</span>
              <strong>{money(o.totalCents)}</strong>
              <span className="admin-order-time">{new Date(o.createdAt).toLocaleString('en-ZA')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
