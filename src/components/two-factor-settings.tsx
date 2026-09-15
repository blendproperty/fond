'use client';
import { useEffect, useState } from 'react';
export function TwoFactorSettings() {
  const [named, setNamed] = useState(false), [active, setActive] = useState(false);
  const [secret, setSecret] = useState(''), [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[]>([]), [message, setMessage] = useState('');
  useEffect(() => { fetch('/api/admin/two-factor', { cache: 'no-store' }).then(async response => { setNamed(response.ok); if (response.ok) setActive((await response.json()).active); }).catch(() => {}); }, []);
  async function action(body: Record<string, string>) {
    const response = await fetch('/api/admin/two-factor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message ?? 'Could not enable 2FA.'); return; }
    if (body.action === 'begin') { setSecret(result.secret); setMessage('Add this secret to your authenticator, then enter a six digit code.'); }
    else { setActive(true); setSecret(''); setCode(''); setRecovery(result.recoveryCodes ?? []); setMessage('2FA is enabled. Save the recovery codes securely now; they are shown once.'); }
  }
  return <section className="manage-card"><h2>Two factor sign-in</h2>
    {!named ? <p>Create and sign in with a named admin account to enroll an authenticator. The shared admin code is bootstrap access only.</p> : active ? <p>Authenticator is active on your named admin account.</p> : <>
      <p>Use a 30 second, six digit authenticator app. Enabling 2FA on a named super admin disables the shared admin code.</p>
      {!secret ? <button className="outline" onClick={() => action({ action: 'begin' })}>Set up authenticator</button> : <>
        <label className="field">Authenticator secret<input readOnly value={secret} /></label>
        <label className="field">Six digit code<input value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" pattern="[0-9]{6}" maxLength={6}/></label>
        <button className="primary" disabled={!/^\d{6}$/.test(code)} onClick={() => action({ action: 'activate', code })}>Verify and enable 2FA</button>
      </>}
    </>}
    {recovery.length > 0 && <div><h3>One time recovery codes</h3><p>Save these outside FOND. Each code works once.</p><ul>{recovery.map(value => <li key={value}><code>{value}</code></li>)}</ul><button className="outline" onClick={() => setRecovery([])}>I saved these codes</button></div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
