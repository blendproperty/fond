'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export function TwoFactorSettings({endpoint='/api/admin/two-factor'}:{endpoint?:string}={}) {
  const [named, setNamed] = useState(false), [active, setActive] = useState(false);
  const [secret, setSecret] = useState(''), [uri, setUri] = useState(''), [code, setCode] = useState('');
  const [showKey, setShowKey] = useState(false), [qrError, setQrError] = useState(false);
  const [recovery, setRecovery] = useState<string[]>([]), [message, setMessage] = useState('');
  const [disabling, setDisabling] = useState(false), [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => { fetch(endpoint, { cache: 'no-store' }).then(async response => { setNamed(response.ok); if (response.ok) setActive((await response.json()).active); }).catch(() => {}); }, [endpoint]);
  useEffect(() => {
    if (!uri || !canvas.current) return;
    let cancelled = false;
    QRCode.toCanvas(canvas.current, uri, { width: 240, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#102a28', light: '#ffffff' } })
      .then(() => { if (!cancelled) setQrError(false); })
      .catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [uri]);

  async function action(body: Record<string, string>) {
    setBusy(true); setMessage('');
    try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message ?? 'Could not enable 2FA.'); return; }
    if (body.action === 'begin') {
      setSecret(result.secret); setUri(result.uri); setQrError(false);
      setMessage('Scan the QR code with your authenticator app, then enter its six digit code.');
    } else if (body.action === 'disable') {
      window.location.assign('/admin');
    } else {
      setActive(true); setSecret(''); setUri(''); setCode('');
      setRecovery(result.recoveryCodes ?? []);
      setMessage('2FA is enabled. Save the recovery codes securely now; they are shown once.');
    }
    } catch { setMessage('Could not update 2FA. Please try again.'); }
    finally { setBusy(false); }
  }

  return <section className="manage-card two-factor-card"><h2>Two factor sign-in</h2>
    {!named ? <p>Create and sign in with a named admin account to choose optional two-factor sign-in. The shared admin code is bootstrap access only.</p> : active ? <>
      <p>Two-factor sign-in is on. You can choose to turn it off for your account.</p>
      {!disabling ? <button className="outline" onClick={() => {setDisabling(true);setCode('');setMessage('');}}>Turn off 2FA</button> : <form onSubmit={event => {event.preventDefault();void action({action:'disable',code});}}>
        <p>Confirm with your current authenticator or recovery code. You will then sign in again with your username and password. If this is the last super admin with 2FA, shared admin code access becomes available again.</p>
        <label className="field">Authenticator or recovery code<input value={code} onChange={event => setCode(event.target.value)} autoComplete="one-time-code" maxLength={64} required /></label>
        <button className="outline" disabled={busy||!code.trim()}>Confirm turn off 2FA</button>
        <button type="button" className="quiet" disabled={busy} onClick={() => {setDisabling(false);setCode('');setMessage('');}}>Keep 2FA on</button>
      </form>}
    </> : <>
      <p>Two-factor sign-in is optional and currently off. You can continue with your username and password, or add an authenticator app whenever you choose. Enabling 2FA on a named super admin disables the shared admin code.</p>
      {!secret ? <button className="outline" disabled={busy} onClick={() => action({ action: 'begin' })}>Set up authenticator</button> : <div className="two-factor-setup">
        <div className="two-factor-scan"><div className="two-factor-step">1 · Scan this code</div>
          <p>Open your authenticator app and scan the QR code with your phone.</p>
          <div className="two-factor-qr"><canvas ref={canvas} role="img" aria-label="Authenticator setup QR code" /></div>
          {qrError && <p role="alert">Could not draw the QR code. Use the manual setup key below.</p>}
          <details className="two-factor-manual"><summary>Using the same phone? Enter a setup key instead</summary>
            <p>Add a time-based account in your authenticator app. Use FOND as the issuer and a 30 second, six digit code.</p>
            <label className="field">Manual setup key<input readOnly value={secret} type={showKey ? 'text' : 'password'} autoComplete="off" spellCheck={false} /></label>
            <button type="button" className="quiet" onClick={() => setShowKey(value => !value)}>{showKey ? 'Hide key' : 'Show key'}</button>
          </details>
        </div>
        <div className="two-factor-confirm"><div className="two-factor-step">2 · Confirm it works</div>
          <p>Enter the current six digit code from your authenticator app. The QR code alone does not enable 2FA.</p>
          <label className="field">Six digit code<input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" /></label>
          <button className="primary" disabled={busy||!/^\d{6}$/.test(code)} onClick={() => action({ action: 'activate', code })}>Verify and enable 2FA</button>
          <button type="button" className="quiet" disabled={busy} onClick={() => {setSecret('');setUri('');setCode('');setMessage('2FA remains off. You can set it up later.');}}>Skip for now</button>
          <p className="two-factor-note">After verification, save the recovery codes outside FOND. You will see them only once.</p>
        </div>
      </div>}
    </>}
    {recovery.length > 0 && <div><h3>One time recovery codes</h3><p>Save these outside FOND. Each code works once.</p><ul>{recovery.map(value => <li key={value}><code>{value}</code></li>)}</ul><button className="outline" onClick={() => setRecovery([])}>I saved these codes</button></div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
