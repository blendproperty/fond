'use client';
import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Grid2x2, List, Lock, LogOut, Megaphone, Minus, Pencil, Plus, RefreshCw, Rows3, Save, Settings, Sparkles, Trash2, TrendingDown, TrendingUp, UtensilsCrossed, Users, Wallet } from 'lucide-react';
import { money, categories, type Category, type Meal, type Modifier } from '@/lib/menu';

import { ReportsDashboard } from './reports-dashboard';
import { CustomersPanel,MarketingPanel,FinancePanel,SettingsPanel } from './management-panels';

type AdminSection = 'menu' | 'orders' | 'customers' | 'marketing' | 'reports' | 'finance' | 'settings';

const NAV: { key: AdminSection; label: string; icon: typeof UtensilsCrossed; ready: boolean }[] = [
  { key: 'menu', label: 'Menu & specials', icon: UtensilsCrossed, ready: true },
  { key: 'orders', label: 'Orders', icon: BarChart3, ready: true },
  { key: 'customers', label: 'Customers', icon: Users, ready: true },
  { key: 'marketing', label: 'Marketing & CMS', icon: Megaphone, ready: true },
  { key: 'reports', label: 'Reports', icon: BarChart3, ready: true },
  { key: 'finance', label: 'Finance', icon: Wallet, ready: true },
  { key: 'settings', label: 'Settings', icon: Settings, ready: true },
];

type AdminOrder = {
  lines: {id:string;name?:string;quantity:number;modifiers?:{name:string}[]}[];
  note:string|null;
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
  const [named,setNamed]=useState(false);
  const [username,setUsername]=useState('');
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState<AdminSection>('menu');

  const check = useCallback(async () => {
    const res = await fetch('/api/admin/menu', { cache: 'no-store' });
    setLocked(res.status === 401);
  }, []);

  useEffect(() => { check().finally(() => setChecking(false)); }, [check]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(named ? {username,password:code} : {code}) });
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
          <label className="field-check"><input type="checkbox" checked={named} onChange={e=>{setNamed(e.target.checked);setCode('');}}/> Sign in with a named account</label>
          {named && <label className="field">Username<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username"/></label>}
          <input type="password" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Admin code" aria-label="Admin access code" />
          {loginError && <p role="alert" className="staff-error">{loginError}</p>}
          <button className="primary full" type="submit">Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <nav className="admin-nav" aria-label="Admin sections">
        <div className="admin-nav-brand">fond<span>.</span></div>
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button key={n.key} aria-label={n.label} title={n.label} className="admin-nav-item" aria-current={tab === n.key} onClick={() => setTab(n.key)}>
              <Icon size={17} />
              <span>{n.label}</span>

            </button>
          );
        })}
        <button className="admin-nav-item admin-nav-logout" onClick={logout}><LogOut size={17} /> <span>Log out</span></button>
      </nav>
      <div className="admin-main">
        <header className="staff-header">
          <div>
            <p className="eyebrow">FOND · ADMIN</p>
            <h1>{NAV.find((n) => n.key === tab)?.label}</h1>
          </div>
        </header>
        {tab === 'menu' && <MenuAdmin />}
        {tab === 'orders' && <OrdersAdmin />}
        {tab === 'reports' && <ReportsDashboard />}
        {tab === 'customers' && <CustomersPanel/>}{tab === 'marketing' && <MarketingPanel/>}{tab === 'finance' && <FinancePanel/>}{tab === 'settings' && <SettingsPanel/>}
      </div>
    </div>
  );
}

type ViewMode = 'list' | 'card' | 'compact';

function MenuAdmin() {
  const [items, setItems] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: categories[0] as Category, price: '', description: '' });
  const [addError, setAddError] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'' | 'available' | 'unavailable'>('');
  const [specialsOnly, setSpecialsOnly] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/menu', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.menu ?? []);
  }, []);

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  async function patch(id: string, body: Record<string, unknown>) {
    setSavingId(id);setAddError('');
    try{const res=await fetch(`/api/admin/menu/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.message??'Could not save item.');await refresh();}catch(e){setAddError((e as Error).message);}finally{setSavingId(null);}
  }

  async function remove(id: string) {
    if (!confirm('Remove this item from the menu?')) return;
    try { const res=await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' });if(!res.ok)throw new Error('Could not remove the item.');await refresh(); } catch(e){setAddError((e as Error).message);}
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

  const filtered = items.filter((m) => {
    if (search.trim() && !m.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (availabilityFilter === 'available' && m.available === false) return false;
    if (availabilityFilter === 'unavailable' && m.available !== false) return false;
    if (specialsOnly && !m.isSpecial) return false;
    return true;
  });
  const visibleCategories = categoryFilter ? [categoryFilter] : categories;

  return (
    <div>
      {addError && !adding && <p role="alert">{addError}</p>}
      <div className="admin-toolbar">
        <button className="primary" onClick={() => setAdding((v) => !v)}><Plus size={16} /> {adding ? 'Cancel' : 'Add item / special'}</button>
        <button className="quiet" onClick={refresh}><RefreshCw size={16} /> Refresh</button>
        <div className="admin-view-switch" role="tablist" aria-label="Menu view">
          <button role="tab" aria-selected={view === 'list'} onClick={() => setView('list')} aria-label="List view"><List size={16} /></button>
          <button role="tab" aria-selected={view === 'card'} onClick={() => setView('card')} aria-label="Card view"><Grid2x2 size={16} /></button>
          <button role="tab" aria-selected={view === 'compact'} onClick={() => setView('compact')} aria-label="Compact view"><Rows3 size={16} /></button>
        </div>
      </div>
      <div className="admin-filters">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items…" />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as Category | '')}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value as '' | 'available' | 'unavailable')}>
          <option value="">Available &amp; hidden</option>
          <option value="available">On menu only</option>
          <option value="unavailable">Hidden only</option>
        </select>
        <label className="field-check"><input type="checkbox" checked={specialsOnly} onChange={(e) => setSpecialsOnly(e.target.checked)} /> Specials only</label>
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
      {filtered.length === 0 && <p className="staff-empty">No items match those filters.</p>}
      {visibleCategories.map((cat) => {
        const catItems = filtered.filter((m) => m.category === cat);
        if (!catItems.length) return null;
        return (
          <section key={cat} className="admin-category">
            <h2>{cat}</h2>
            <div className={`admin-item-list admin-item-list-${view}`}>
              {catItems.map((item) => (
                <MenuRow key={item.id} item={item} view={view} saving={savingId === item.id} onPatch={(body) => patch(item.id, body)} onRemove={() => remove(item.id)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const DIET_OPTIONS: Array<'vegan' | 'vegetarian' | 'gluten-free'> = ['vegan', 'vegetarian', 'gluten-free'];

function MenuRow({ item, view, saving, onPatch, onRemove }: { item: Meal; view: ViewMode; saving: boolean; onPatch: (body: Record<string, unknown>) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState((item.basePrice ?? item.price) / 100 + '');
  const [specialPrice, setSpecialPrice] = useState(item.isSpecial && item.basePrice ? (item.price / 100 + '') : '');
  const [specialLabel, setSpecialLabel] = useState(item.specialLabel ?? '');
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [category, setCategory] = useState<Category>(item.category);
  const [symbol, setSymbol] = useState(item.symbol);
  const [diet, setDiet] = useState<string[]>(item.diet ?? []);
  const [newModName, setNewModName] = useState('');
  const [newModPrice, setNewModPrice] = useState('');
  const [modBusy, setModBusy] = useState(false);
  const [modError, setModError] = useState('');

  function toggleDiet(d: string) {
    const next = diet.includes(d) ? diet.filter((x) => x !== d) : [...diet, d];
    setDiet(next);
    onPatch({ diet: next });
  }

  async function addModifier() {
    setModError('');
    const priceCents = Math.round(parseFloat(newModPrice || '0') * 100);
    if (!newModName.trim() || !Number.isFinite(priceCents)) { setModError('Enter a modifier name and price.'); return; }
    setModBusy(true);
    const res = await fetch(`/api/admin/menu/${item.id}/modifiers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newModName.trim(), price: priceCents }) });
    setModBusy(false);
    if (!res.ok) { const data = await res.json().catch(() => null); setModError(data?.message ?? 'Could not add that modifier.'); return; }
    const data = await res.json();
    onPatch({ modifiers: data.item.modifiers });
    setNewModName(''); setNewModPrice('');
  }

  async function removeModifier(modifierId: string) {
    setModBusy(true);
    const res = await fetch(`/api/admin/menu/${item.id}/modifiers/${modifierId}`, { method: 'DELETE' });
    setModBusy(false);
    if (!res.ok) return;
    const data = await res.json();
    onPatch({ modifiers: data.item.modifiers });
  }

  return (
    <div className={`admin-row admin-row-${view}${item.available === false ? ' admin-row-off' : ''}`}>
      <div className="admin-row-main">
        <span className="admin-row-symbol">{item.symbol}</span>
        <div className="admin-row-name">
          <strong>{item.name}</strong>
          {view !== 'compact' && <span>{item.description}</span>}
        </div>
        <label className="admin-price">R<input value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => onPatch({ price: Math.round(parseFloat(price || '0') * 100) })} inputMode="decimal" /></label>
        <label className="field-check"><input type="checkbox" checked={item.available !== false} onChange={(e) => onPatch({ available: e.target.checked })} /> On menu</label>
        <button className="icon-button" aria-label={editing ? 'Close edit' : `Edit ${item.name}`} onClick={() => setEditing((v) => !v)}><Pencil size={16} /></button>
        <button className="icon-button" aria-label={`Remove ${item.name}`} onClick={onRemove}><Trash2 size={16} /></button>
      </div>
      {editing && (
        <div className="admin-row-edit">
          <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => onPatch({ name })} /></label>
          <label className="field">Description<input value={description} onChange={(e) => setDescription(e.target.value)} onBlur={() => onPatch({ description })} /></label>
          <label className="field">Category<select value={category} onChange={(e) => { const v = e.target.value as Category; setCategory(v); onPatch({ category: v }); }}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="field">Symbol/emoji<input value={symbol} onChange={(e) => setSymbol(e.target.value)} onBlur={() => onPatch({ symbol })} style={{ maxWidth: 80 }} /></label>
          <div className="field-check-row">
            {DIET_OPTIONS.map((d) => (
              <label className="field-check" key={d}><input type="checkbox" checked={diet.includes(d)} onChange={() => toggleDiet(d)} /> {d}</label>
            ))}
          </div>
          <div className="admin-modifiers">
            <h4>Modifiers (add this / remove this)</h4>
            {(item.modifiers ?? []).length === 0 && <p className="small">No modifiers yet — e.g. &ldquo;Extra cheese&rdquo; at +R15 or &ldquo;No onion&rdquo; at R0.</p>}
            {(item.modifiers ?? []).map((mod: Modifier) => (
              <div className="admin-modifier-row" key={mod.id}>
                <span>{mod.name}</span>
                <span>{mod.price > 0 ? '+' : ''}{money(mod.price)}</span>
                <button className="icon-button" aria-label={`Remove ${mod.name}`} disabled={modBusy} onClick={() => removeModifier(mod.id)}><Minus size={14} /></button>
              </div>
            ))}
            <div className="admin-modifier-add">
              <input value={newModName} onChange={(e) => setNewModName(e.target.value)} placeholder="e.g. Extra cheese" />
              <input value={newModPrice} onChange={(e) => setNewModPrice(e.target.value)} placeholder="15.00 (or -15.00, or 0)" inputMode="decimal" style={{ maxWidth: 130 }} />
              <button className="quiet" disabled={modBusy} onClick={addModifier}><Plus size={14} /> Add</button>
            </div>
            {modError && <p role="alert">{modError}</p>}
          </div>
        </div>
      )}
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
  const [history,setHistory]=useState<Record<string,{to_status:string;actor:string;created_at:string}[]>>({});
  const [historyError,setHistoryError]=useState('');
  async function loadHistory(id:string){try{const r=await fetch('/api/admin/manage/history?id='+id);if(!r.ok)throw new Error('Could not load history.');setHistory(h=>({...h,[id]:[]}));const d=await r.json();setHistory(h=>({...h,[id]:d.events}));}catch(e){setHistoryError((e as Error).message);}}

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
          {historyError&&<p role="alert">{historyError}</p>}
          {orders.map((o) => (
            <div className="admin-order-row" key={o.id}>
              <span className="staff-ref">{o.reference}</span>
              <strong>{o.customerName}</strong>
              <span>{o.fulfillment === 'delivery' ? `Delivery · ${o.building ?? ''}` : o.collectionTime}</span>
              <span className={`admin-status admin-status-${o.status}`}>{o.status}</span>
              <strong>{money(o.totalCents)}</strong>
              <span className="admin-order-time">{new Date(o.createdAt).toLocaleString('en-ZA')}</span>
              <details className="admin-order-details" onToggle={e=>{if(e.currentTarget.open&&!history[o.id])void loadHistory(o.id);}}><summary>Order details &amp; history</summary><p>{o.contactNumber} {o.company} {o.note}</p>{o.lines.map((l,i)=><p key={i}>{l.quantity} × {l.name??l.id}{l.modifiers?.length?' · '+l.modifiers.map(m=>m.name).join(', '):''}</p>)}{history[o.id]?.map((e,i)=><p key={i}>{e.to_status} · {e.actor} · {new Date(e.created_at).toLocaleString()}</p>)}</details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
