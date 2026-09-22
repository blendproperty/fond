'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type User = { id: string; email: string; emailVerified: boolean };
type Order = { reference: string; status: string; createdAt: string; collectionTime: string; totalCents: number; lines: { name: string; quantity: number; subtotalCents: number }[]; payment: { paidCents: number } };
export function CustomerAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  async function sendCode() {
    const response = await fetch('/api/account/verification', { method: 'POST' });
    const result = await response.json();
    setVerificationMessage(response.ok ? 'Verification code sent. Check your inbox.' : result.message ?? 'Could not send the code.');
  }
  async function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/account/verification', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
    const result = await response.json();
    setVerificationMessage(response.ok ? 'Email verified.' : result.message ?? 'Could not verify email.');
    if (response.ok) { setCode(''); await refresh(); }
  }
  async function refresh() {
    const session = await fetch('/api/auth/session', { cache: 'no-store' }).then(r => r.json());
    setUser(session.user ?? null);
    if (session.user) {
      const result = await fetch('/api/account/orders', { cache: 'no-store' }).then(r => r.json());
      setOrders(result.orders ?? []);
    } else setOrders([]);
    setLoading(false);
  }
  useEffect(() => { refresh().catch(() => { setError('Could not load your account.'); setLoading(false); }); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? 'Could not sign in.'); return; }
    setPassword(''); await refresh();
  }
  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); await refresh(); }
  return <main className="account-page" style={{ maxWidth: 760, margin: '3rem auto', padding: '0 1.5rem' }}>
    <Link href="/">← Back to menu</Link>
    <p className="eyebrow">FOND · YOUR ACCOUNT</p><h1>Your orders</h1>
    {loading ? <p>Loading…</p> : user ? <>
      <p>Signed in as {user.email} <button className="quiet" onClick={logout}>Sign out</button></p>
      <p>Orders placed while signed in appear here. Guest orders can still be tracked using their reference on the menu page.</p>
      {!user.emailVerified && <section className="staff-card" style={{ marginBottom: 20 }}><h2>Verify your email</h2><p>Verify your address to confirm ownership of this account. You can still enter an email address for order updates at checkout.</p><button className="outline" onClick={sendCode}>Send verification code</button><form onSubmit={confirmCode}><label className="field">Six digit code<input value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} /></label><button className="primary" type="submit">Verify email</button></form>{verificationMessage && <p role="status">{verificationMessage}</p>}</section>}
      {orders.length ? orders.map(order => <article key={order.reference} className="staff-card" style={{ marginBottom: 16 }}>
        <h2>{order.reference}</h2><p>{new Date(order.createdAt).toLocaleString()} · {order.status} · {order.collectionTime}</p>
        <ul>{order.lines.map((line, index) => <li key={index}>{line.quantity}× {line.name}</li>)}</ul>
        <strong>R{(order.totalCents / 100).toFixed(2)}</strong><p>{order.payment?.paidCents >= order.totalCents ? 'Paid' : 'Payment due or pending'}</p>
      </article>) : <p>You have not placed an order while signed in yet.</p>}
    </> : <form onSubmit={submit} className="staff-lock-card" style={{ margin: '2rem 0' }}>
      <h2>{mode === 'login' ? 'Sign in' : 'Create an account'}</h2>
      <label className="field">Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label>
      <label className="field">Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
      {error && <p role="alert" className="staff-error">{error}</p>}
      <button className="primary" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
      <button className="quiet" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Already have an account?'}</button>
    </form>}
  </main>;
}
