'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export function TwoFactorSettings() {
  const [named, setNamed] = useState(false), [active, setActive] = useState(false);
  const [secret, setSecret] = useState(''), [uri, setUri] = useState(''), [code, setCode] = useState('');
  const [showKey, setShowKey] = useState(false), [qrError, setQrError] = useState(false);
  const [recovery, setRecovery] = useState<string[]>([]), [message, setMessage] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => { fetch('/api/admin/two-factor', { cache: 'no-store' }).then(async response => { setNamed(response.ok); if (response.ok) setActive((await response.json()).active); }).catch(() => {}); }, []);
  useEffect(() => {
    if (!uri || !canvas.current) return;
    let cancelled = false;
    QRCode.toCanvas(canvas.current, uri, { width: 240, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#102a28', light: '#ffffff' } })
      .then(() => { if (!cancelled) setQrError(false); })
      .catch(() => { if (!cancelled) setQrError(true); });
    return () => { cancelled = true; };
  }, [uri]);

  async function action(body: Record<string, string>) {
    const response = await fetch('/api/admin/two-factor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.message ?? 'Could not enable 2FA.'); return; }
    if (body.action === 'begin') {
      setSecret(result.secret); setUri(result.uri); setQrError(false);
      setMessage('Scan the QR code with your authenticator app, then enter its six digit code.');
    } else {
      setActive(true); setSecret(''); setUri(''); setCode('');
      setRecovery(result.recoveryCodes ?? []);
      setMessage('2FA is enabled. Save the recovery codes securely now; they are shown once.');
    }
  }

  return <section className="manage-card two-factor-card"><h2>Two factor sign-in</h2>
    {!named ? <p>Create and sign in with a named admin account to enroll an authenticator. The shared admin code is bootstrap access only.</p> : active ? <p>Authenticator is active on your named admin account.</p> : <>
      <p>Add an authenticator app to protect your account. Enabling 2FA on a named super admin disables the shared admin code.</p>
      {!secret ? <button className="outline" onClick={() => action({ action: 'begin' })}>Set up authenticator</button> : <div className="two-factor-setup">
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
          <button className="primary" disabled={!/^\d{6}$/.test(code)} onClick={() => action({ action: 'activate', code })}>Verify and enable 2FA</button>
          <p className="two-factor-note">After verification, save the recovery codes outside FOND. You will see them only once.</p>
        </div>
      </div>}
    </>}
    {recovery.length > 0 && <div><h3>One time recovery codes</h3><p>Save these outside FOND. Each code works once.</p><ul>{recovery.map(value => <li key={value}><code>{value}</code></li>)}</ul><button className="outline" onClick={() => setRecovery([])}>I saved these codes</button></div>}
    {message && <p role="status">{message}</p>}
  </section>;
}
