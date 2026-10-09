'use client';
import { useEffect, useState } from 'react';

type Config = { enabled: boolean; phoneNumberId: string; acceptedTemplateId: string; readyTemplateId: string; nameParameter: string; referenceParameter: string };
const empty: Config = { enabled: false, phoneNumberId: '', acceptedTemplateId: '', readyTemplateId: '', nameParameter: '', referenceParameter: '' };
export function WhatChimpSettings() {
  const [config, setConfig] = useState<Config>(empty), [allowed, setAllowed] = useState(false), [stored, setStored] = useState(false), [configured, setConfigured] = useState(false), [vaultReady, setVaultReady] = useState(false);
  const [environment, setEnvironment] = useState('staging');
  const [key, setKey] = useState(''), [to, setTo] = useState(''), [template, setTemplate] = useState('session'), [message, setMessage] = useState(''), [providerId, setProviderId] = useState(''), [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await fetch('/api/admin/provider-credentials', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json(); setConfig(data.whatchimp ?? empty); setAllowed(data.whatchimpAllowed === true); setEnvironment(data.whatchimpEnvironment ?? 'staging'); setStored(data.configured?.['whatchimp-api-token'] === true); setConfigured(data.whatchimpConfigured === true); setVaultReady(data.vaultReady === true);
  }
  useEffect(() => { void refresh(); }, []);
  async function save(name: string, value: unknown) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/provider-credentials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, value }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message ?? 'Could not save WhatChimp settings.');
      if (name === 'whatchimp-api-token') setKey(''); setMessage('WhatChimp settings saved.'); await refresh();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function test(action = 'send') {
    setBusy(true); setMessage(''); if (action === 'send') setProviderId('');
    try {
      const response = await fetch('/api/admin/whatchimp/test-message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'status' ? { action, providerId } : { to, template }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message ?? 'Could not complete WhatChimp test.');
      if (action === 'status') setMessage(`Delivery status: ${data.status}. Confirm the message on your phone.`);
      else { setMessage(data.message); setProviderId(data.providerId ?? ''); }
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  if (!allowed) return null;
  const fields: [keyof Omit<Config, 'enabled'>, string][] = [['phoneNumberId', 'WhatChimp phone number ID'], ['acceptedTemplateId', 'WhatChimp accepted-order template ID'], ['readyTemplateId', 'WhatChimp ready-order template ID'], ['nameParameter', 'WhatChimp customer-name parameter (optional)'], ['referenceParameter', 'WhatChimp order-reference parameter']];
  return <div className="provider-test"><h3>WhatsApp messages · {environment}</h3><p>Use the connected Midpoint Cafe number. Credentials stay encrypted in this environment. Customer replies appear in the <a href="https://app.whatchimp.com/all/livechat" target="_blank" rel="noreferrer">WhatChimp inbox</a>.</p>
    <label className="field">WhatChimp API key · {stored ? 'Stored' : 'Not stored'}<input type="password" autoComplete="off" value={key} onChange={event => setKey(event.target.value)} /></label><button className="outline" disabled={!vaultReady || !key || busy} onClick={() => void save('whatchimp-api-token', key)}>Save WhatChimp API key</button>
    {fields.map(([name, label]) => <label className="field" key={name}>{label}<input value={config[name]} onChange={event => setConfig({ ...config, [name]: event.target.value })} /></label>)}
    <p className="small">Copy template IDs and exact variable parameter names from WhatChimp API Developer after both templates are approved. Leave the name parameter empty when the template uses WhatChimp's subscriber name.</p>
    <label><input type="checkbox" checked={config.enabled} onChange={event => setConfig({ ...config, enabled: event.target.checked })} /> Use WhatChimp for {environment} order notifications</label><p><button className="outline" disabled={busy} onClick={() => void save('whatchimp-config', config)}>Save WhatChimp configuration</button></p>
    <h4>Test WhatsApp on your phone</h4><ol><li>Send TEST from your phone to <a href="https://wa.me/27690420108?text=TEST" target="_blank" rel="noreferrer">Midpoint Cafe on WhatsApp</a>. This opens the 24-hour reply window.</li><li>Enter that same phone number below and send the connection test.</li><li>Reply TEST RECEIVED and check the WhatChimp inbox. Use the order tests once both templates are approved and configured.</li></ol>
    <label className="field">WhatChimp test recipient mobile number<input inputMode="tel" value={to} onChange={event => setTo(event.target.value)} placeholder="+27 82 123 4567" /></label>
    <label className="field">WhatChimp test message<select value={template} onChange={event => setTemplate(event.target.value)}><option value="session">Connection test · message us first</option><option value="order_accepted">Order accepted · approved template</option><option value="order_ready">Order ready · approved template</option></select></label>
    <button className="primary" disabled={!configured || !to || busy || (template !== 'session' && (!config.acceptedTemplateId || !config.readyTemplateId || !config.referenceParameter))} onClick={() => void test()}>Send WhatChimp test</button>{providerId && <p><button className="outline" disabled={busy} onClick={() => void test('status')}>Check WhatChimp delivery</button></p>}<p role="status">{message}</p>
  </div>;
}
