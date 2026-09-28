'use client';
import {useEffect,useRef,useState} from 'react';
import {Coffee,X} from 'lucide-react';
type Variant={id:string;name:string};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function post(url:string,body:unknown){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok)throw new Error(d.message??'Please try again.');return d;}

export function CounterStamps(){
 const [open,setOpen]=useState(false),[memberCode,setMemberCode]=useState(''),[number,setNumber]=useState(''),[date,setDate]=useState(today),[preview,setPreview]=useState<any>(null),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[enabled,setEnabled]=useState(false),[camera,setCamera]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null);
 useEffect(()=>{if(open){dialog.current?.showModal();fetch('/api/staff/counter-rewards',{cache:'no-store'}).then(r=>r.json()).then(d=>setEnabled(!!d.enabled)).catch(()=>setError('Could not check counter rewards.'));}else dialog.current?.close();},[open]);
 useEffect(()=>{setPreview(null);setMessage('');setError('');},[memberCode,number,date]);
 useEffect(()=>{if(!camera)return;let stopped=false,stream:MediaStream|undefined,timer:ReturnType<typeof setTimeout>;
  (async()=>{try{const Detector=(window as any).BarcodeDetector;if(!Detector)throw new Error('Camera scanning is unavailable here. Type the membership number or use a QR scanner.');
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});if(stopped){stream.getTracks().forEach(t=>t.stop());return;}video.current!.srcObject=stream;await video.current!.play();const detector=new Detector({formats:['qr_code']});
   const scan=async()=>{if(stopped)return;try{const found=await detector.detect(video.current!);const code=found.find((v:any)=>/^FOND-M-[A-F0-9]{12}$/.test(v.rawValue))?.rawValue;if(code){setMemberCode(code);setCamera(false);return;}}catch{/* wait for video frame */}timer=setTimeout(scan,300);};await scan();
  }catch(e){setError((e as Error).message);setCamera(false);}})();return()=>{stopped=true;clearTimeout(timer);stream?.getTracks().forEach(t=>t.stop());};
 },[camera]);
 function close(){setOpen(false);setCamera(false);}
 async function lookup(){setBusy(true);setError('');setMessage('');setPreview(null);try{setPreview(await post('/api/staff/counter-rewards',{action:'preview',memberCode,number,date}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function award(){setBusy(true);setError('');try{const d=await post('/api/staff/counter-rewards',{...preview,action:'award'});setMessage(d.alreadyAdded?'These stamps were already added.':d.quantity+' coffee stamps added. The customer can refresh their coffee card.');setPreview(null);}catch(e){setError((e as Error).message);setPreview(null);}finally{setBusy(false);}}
 return <><button className="outline" onClick={()=>setOpen(true)}><Coffee size={18}/> Add coffee stamps</button>
 <dialog className="counter-stamps-dialog" ref={dialog} onCancel={close} onClose={close} aria-labelledby="counter-stamps-title">
 <header><div><p className="eyebrow">COUNTER COFFEE REWARDS</p><h2 id="counter-stamps-title">Add coffee stamps</h2></div><button className="icon-button" aria-label="Close counter stamps" onClick={close}><X/></button></header>
 <p>Complete the sale once in Yoco. Link that receipt to the customer’s coffee card here.</p>
 {!enabled&&<p className="notice">Counter earning is paused or awaiting Yoco setup. An administrator can configure it in Marketing & CMS.</p>}
 <fieldset disabled={busy||!enabled}><label className="field">Customer membership number<input value={memberCode} onChange={e=>setMemberCode(e.target.value.toUpperCase())} maxLength={40} placeholder="FOND-M-…" autoComplete="off"/></label><button className="outline" type="button" onClick={()=>setCamera(!camera)}>{camera?'Stop camera':'Scan membership QR'}</button>
 {camera&&<video ref={video} muted playsInline aria-label="Membership QR camera"/>}
 <div className="counter-receipt-fields"><label className="field">Yoco order number<input value={number} onChange={e=>setNumber(e.target.value)} maxLength={100}/></label><label className="field">Receipt date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <button className="primary" disabled={!memberCode||!number||!date} onClick={lookup}>{busy?'Checking…':'Check Yoco receipt'}</button></fieldset>
 {preview&&<section className="counter-confirm"><p className="eyebrow">{preview.environment==='test'?'TEST STAMPS':'PAID SALE VERIFIED'}</p><h3>{preview.quantity} coffee {preview.quantity===1?'stamp':'stamps'}</h3><p>Member: {preview.email}<br/>Yoco #{preview.number} · {preview.date}</p><ul>{preview.items.map((l:any)=><li key={l.id}>{l.quantity} × {l.name}</li>)}</ul><p>Confirm this is the customer who paid for this counter sale.</p><button className="primary" disabled={busy} onClick={award}>{busy?'Adding…':'Confirm and add stamps'}</button></section>}
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 <small>No order or payment is created here. Each receipt can earn once. App and prepaid EFT orders cannot earn again.</small>
 </dialog></>;
}
export function AdminCounterRewards(){
 const [data,setData]=useState<any>(null),[variants,setVariants]=useState<Variant[]>([]),[items,setItems]=useState<any[]>([]),[number,setNumber]=useState(''),[date,setDate]=useState(today),[reason,setReason]=useState(''),[confirm,setConfirm]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await fetch('/api/admin/counter-rewards',{cache:'no-store'});if(!r.ok)throw new Error('Could not load counter rewards.');const d=await r.json();setData(d);setVariants(d.config.variants);}
 useEffect(()=>{load().catch(e=>setMessage(e.message));},[]);
 async function action(body:any){setBusy(true);setMessage('');try{const d=await post('/api/admin/counter-rewards',body);if(body.action==='inspect'){setItems(d.items);setMessage('Select only Coffee items. Load other receipts to add more coffee varieties.');}else {await load();setMessage(body.action==='rollback'?`${d.reversed} counter entries reversed. Counter earning is paused.`:body.action==='pause'?'Counter earning paused. Existing stamps retained.':body.action==='reverse'?'Counter stamps reversed. History retained.':'Counter trial enabled. Verify a test receipt before inviting customers.');}}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section className="manage-card counter-admin"><p className="eyebrow">REVERSIBLE TRIAL</p><h2>Counter coffee stamps</h2><p>Earn from a completed cash/card sale recorded in Yoco. Staff link the receipt to a verified customer’s membership card. No second order or payment is created.</p>
 {data&&<><strong>{data.available?'Counter earning enabled':'Counter earning paused / setup required'} · {data.environment==='test'?'TEST stamps':'LIVE stamps'}</strong>
 {(!data.configured||!data.locationId)&&<p className="notice">First save the Yoco business API key and restaurant location in Settings → Yoco POS reference matching. Automatic prepaid matching can remain off.</p>}
 <h3>1. Choose your Yoco coffee items</h3><p>Load a recent receipt, then select its Coffee items. Only selected product variants qualify. Discounted coffee lines, free coffees and prepaid EFT closures are excluded from this trial.</p>
 <fieldset disabled={busy}><div className="counter-receipt-fields"><label className="field">Setup receipt number<input value={number} onChange={e=>setNumber(e.target.value)}/></label><label className="field">Setup receipt date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
 <button className="outline" disabled={!number||!data.configured||!data.locationId} onClick={()=>action({action:'inspect',number,date})}>Load Yoco coffee items</button>
 {items.map((item:any)=><label className="field-check" key={item.id}><input type="checkbox" checked={variants.some(v=>v.id===item.variantId)} onChange={e=>setVariants(v=>e.target.checked?[...v.filter(x=>x.id!==item.variantId),{id:item.variantId,name:item.name}]:v.filter(x=>x.id!==item.variantId))}/>{item.name}</label>)}
 <p>{variants.length} coffee variants selected</p>{variants.map(v=><p key={v.id}>{v.name} <button className="quiet" onClick={()=>setVariants(old=>old.filter(x=>x.id!==v.id))}>Remove {v.name}</button></p>)}
 <h3>2. Start or pause the trial</h3><p>Before inviting customers, update any published popup and email artwork that says app-only. The account promotion and punch card change automatically when this trial is enabled.</p><button className="primary" disabled={!variants.length||!data.configured||!data.locationId} onClick={()=>action({action:'save',enabled:true,variants})}>Save items and enable counter trial</button> <button className="outline" onClick={()=>action({action:'pause'})}>Pause new counter stamps</button>
 <h3>3. Review or roll back</h3><p>Pausing keeps earned stamps. Reversal removes counter credits and withdraws unused rewards that are no longer earned. Reserved or used rewards remain recorded; their shortfall is deducted from future progress. App purchases and gift codes remain intact.</p>
 <label className="field">Reversal reason<input value={reason} maxLength={200} onChange={e=>setReason(e.target.value)} placeholder="Why are these stamps being reversed?"/></label>
 <details><summary>Roll back all counter stamps</summary><p>This pauses earning and reverses all remaining counter credits, across test and live modes. It cannot undo coffee already handed over.</p><label className="field">Type ROLL BACK COUNTER<input value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><button className="outline" disabled={confirm!=='ROLL BACK COUNTER'||reason.trim().length<5} onClick={()=>action({action:'rollback',reason,confirm})}>Roll back counter stamps</button></details>
 <h3>Recent counter receipts</h3>{!data.sales.length&&<p>No counter stamps recorded yet.</p>}{data.sales.map((s:any)=><article className="counter-sale" key={s.id}><strong>Yoco #{s.order_number} · {s.sale_date}</strong><p>{s.environment} · {s.credited} active / {s.quantity} original stamps · {s.actor}</p>{s.reason&&<p>Reversed: {s.reason}</p>}{s.check_error&&<p role="alert">{s.check_error}</p>}<small>Last Yoco check: {s.checked_at?new Date(s.checked_at).toLocaleString('en-ZA'):'Pending'}</small>{s.credited>0&&<button className="outline" disabled={reason.trim().length<5} onClick={()=>action({action:'reverse',id:s.id,reason})}>Reverse receipt {s.order_number}</button>}</article>)}
 </fieldset><button className="quiet" disabled={busy} onClick={()=>load().catch(e=>setMessage(e.message))}>Refresh counter log</button><small>Refund checks run while the staff board is open. Review failed checks here. This list shows the most recent 100 receipts; rollback covers all counter receipts.</small></>}
 {message&&<p role="status">{message}</p>}</section>;
}

