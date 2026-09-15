'use client';
import {useState} from 'react';
import {categories} from '@/lib/menu';
import type {Promotion} from '@/lib/management';
import {PromotionCard,PromotionPopup} from './promotions';
export function PromotionEditor({promotion:p,onChange,onRemove,onUploading}:{promotion:Promotion;onChange:(p:Promotion)=>void;onRemove:()=>void;onUploading:(busy:boolean)=>void}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function upload(file?:File){if(!file)return;setBusy(true);onUploading(true);setError('');try{const form=new FormData();form.set('image',file);const r=await fetch('/api/admin/promotion-images',{method:'POST',body:form});const d=await r.json();if(!r.ok)throw new Error(d.message);onChange({...p,imageUrl:d.url});}catch(e){setError((e as Error).message);}finally{setBusy(false);onUploading(false);}}
 return <fieldset className="manage-promotion" disabled={busy}><legend>{p.title||'New promotion'}</legend>
 <label className="field">Display format<select value={p.display||'banner'} onChange={e=>onChange({...p,display:e.target.value as Promotion['display']})}><option value="banner">Text banner</option><option value="card">Image with text overlay</option><option value="popup">Popup</option></select></label>
 <label className="field">Promotion title<input maxLength={100} value={p.title} onChange={e=>onChange({...p,title:e.target.value})}/></label><label className="field">Message<textarea maxLength={500} value={p.body} onChange={e=>onChange({...p,body:e.target.value})}/></label>
 {p.display&&p.display!=='banner'&&<><label className="field">Promotion image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void upload(e.target.files?.[0])}/></label><p className="small">JPG, PNG or WebP, up to 2 MB. Use a landscape photo with space for text. Uploaded images are public by link; publish to display the promotion.</p>{p.imageUrl&&<button className="quiet" onClick={()=>onChange({...p,imageUrl:''})}>Remove image</button>}</>}
 {busy&&<p role="status">Uploading image…</p>}{error&&<p role="alert" className="manage-error">{error}</p>}
 <label className="field">Button text<input maxLength={40} value={p.buttonLabel||''} placeholder="View menu" onChange={e=>onChange({...p,buttonLabel:e.target.value})}/></label><label className="field">Open menu category<select value={p.category||''} onChange={e=>onChange({...p,category:e.target.value})}><option value="">Current menu category</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
 {(['startsAt','endsAt'] as const).map(k=><label className="field" key={k}>{k==='startsAt'?'Starts':'Ends'}<input type="datetime-local" value={new Date(new Date(p[k]).getTime()-new Date(p[k]).getTimezoneOffset()*60000).toISOString().slice(0,16)} onChange={e=>{if(e.target.value)onChange({...p,[k]:new Date(e.target.value).toISOString()});}}/></label>)}
 <label className="field-check"><input type="checkbox" checked={p.active} onChange={e=>onChange({...p,active:e.target.checked})}/> Active</label><button className="quiet" onClick={onRemove}>Remove from draft</button></fieldset>;
}
export function PromotionPreview({promotion:p}:{promotion:Promotion}){
 const [open,setOpen]=useState(false);
 return <div className="promotion-preview"><p className="small">{p.display==='popup'?'Popup':p.display==='card'?'Image overlay':'Text banner'} · {p.active?'Scheduled':'Inactive'}</p><PromotionCard promotion={p} onAction={()=>{if(p.display==='popup')setOpen(true);}}/>{p.display==='popup'&&<button className="outline" onClick={()=>setOpen(true)}>Preview popup</button>}{open&&<PromotionPopup promotion={p} onClose={()=>setOpen(false)} onAction={()=>setOpen(false)}/>}</div>;
}
