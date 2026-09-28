'use client';
import {useEffect,useState} from 'react';
type Config={enabled:boolean;environment:'sandbox'|'live';locationId:string;eftMappingVerified:boolean};
type Status={configured:boolean;config:Config;lastChecked:string|null;error:string|null;issues:{staffNumber:string;message:string}[]};
export function YocoPosSettings(){
  const [status,setStatus]=useState<Status|null>(null),[config,setConfig]=useState<Config>({enabled:false,environment:'sandbox',locationId:'',eftMappingVerified:false}),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[recent,setRecent]=useState<{orderNumber:string;paymentMethods:string[]}[]>([]);
  async function refresh(){const r=await fetch('/api/admin/yoco/pos',{cache:'no-store'});if(!r.ok)throw new Error('Could not load Yoco POS settings.');const d=await r.json();setStatus(d);setConfig(d.config);}
  useEffect(()=>{void refresh().catch(e=>setMessage(e.message));},[]);
  async function act(action:'key'|'check'|'save'){
    setBusy(true);setMessage('');
    try {
      const response=await fetch(action==='key'?'/api/admin/provider-credentials':'/api/admin/yoco/pos',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='key'?{name:'yoco-pos-key',value:key}:{action,config}),
      });
      const data=await response.json();if(!response.ok)throw new Error(data.message??'Yoco connection could not be saved.');
      if(action==='key'){setKey('');await refresh();setRecent([]);setMessage('Business API key stored securely. Check the connection next.');}
      else if(action==='check'){setMessage(data.message);setRecent(data.recent??[]);}
      else{setStatus(data);setConfig(data.config);setMessage(config.enabled?'Automatic matching enabled while the staff board is open.':'Automatic matching switched off. Manual POS confirmation remains available.');}
    }catch(error){setMessage(error instanceof Error?error.message:'Yoco connection unavailable.');}finally{setBusy(false);}
  }
  return <div className="provider-test"><h3>Yoco POS reference matching</h3>
    <p>For prepaid online orders, staff add <strong>FOND plus the six-digit staff number</strong> in the Yoco sale note and close the order as EFT. FOND can then read the POS reference automatically. It never records an extra payment.</p>
    <p>Create a personal application for the restaurant business in the <a href="https://developer.yoco.com/ui" target="_blank" rel="noreferrer">Yoco Developer Console</a> with <code>business/orders:read</code>. This uses a separate business API key from online checkout.</p>
    <label className="field">Yoco business API key · {status?.configured?'Stored':'Not stored'}<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder="Personal application API key"/></label>
    <button className="outline" disabled={!key||busy} onClick={()=>void act('key')}>Save Yoco business API key</button>
    <label className="field">Yoco POS environment<select value={config.environment} onChange={e=>{setConfig({...config,environment:e.target.value as Config['environment'],enabled:false,eftMappingVerified:false});setRecent([]);}}><option value="sandbox">Sandbox · test orders</option><option value="live">Live · restaurant orders</option></select></label>
    <label className="field">Yoco location ID (optional)<input value={config.locationId} onChange={e=>{setConfig({...config,locationId:e.target.value,enabled:false,eftMappingVerified:false});setRecent([]);}} placeholder="Restrict to one restaurant location"/></label>
    <label className="field-check"><input type="checkbox" checked={config.eftMappingVerified} onChange={e=>setConfig({...config,eftMappingVerified:e.target.checked,enabled:e.target.checked&&config.enabled})}/> I verified that a known EFT-closed restaurant order appears as “other” in the connection check</label>
    <label className="field-check"><input type="checkbox" checked={config.enabled} onChange={e=>setConfig({...config,enabled:e.target.checked})}/> Automatically match prepaid POS references</label>
    <p className="small">Checks run about every 30 seconds while the staff board is open. The POS environment must match FOND online checkout. Duplicate notes, amount differences and refunds need manual review. Finance must still confirm how the EFT entry and original online sale are reconciled in Yoco reporting.</p>
    <div className="staff-modal-actions"><button className="outline" disabled={!status?.configured||busy} onClick={()=>void act('check')}>Check Yoco order access</button><button className="primary" disabled={!status||busy} onClick={()=>void act('save')}>Save POS matching settings</button></div>
    {message&&<p role="status">{message}</p>}{status?.error&&<p role="alert" className="manage-error">{status.error}</p>}
    {recent.length>0&&<ul>{recent.map(order=><li key={order.orderNumber}>Yoco order {order.orderNumber}: {order.paymentMethods.join(', ')||'No payment details returned'}</li>)}</ul>}
    {status?.lastChecked&&<p className="small">Last check: {new Date(status.lastChecked).toLocaleString('en-ZA')}</p>}
  </div>;
}
