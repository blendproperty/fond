'use client';
import {useEffect,useRef,useState} from 'react';
import type {Promotion} from '@/lib/management';
export function PromotionCard({promotion:p,onAction}:{promotion:Promotion;onAction:()=>void}){
 const visual=p.display!=='banner'&&!!p.imageUrl;
 return <article className={`fond-promo ${p.display==='banner'||!p.display?'promo-banner':'promo-card'} ${visual?'promo-visual':''}`}>
  {visual&&<img src={p.imageUrl} alt=""/>}<div className="promo-copy"><span className="promo-kicker">FOND · SPECIAL OFFER</span><h3>{p.title||'Your promotion title'}</h3>{p.body&&<p>{p.body}</p>}<button className="promo-cta" onClick={onAction}>{p.buttonLabel||'View menu'} <span aria-hidden="true">→</span></button></div>
 </article>;
}
export function PromotionPopup({promotion,onClose,onAction}:{promotion:Promotion;onClose:()=>void;onAction:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close();},[]);
 return <dialog ref={ref} className="promo-dialog" aria-label={promotion.title||'Promotion preview'} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><button autoFocus className="promo-close" aria-label="Close promotion" onClick={onClose}>×</button><PromotionCard promotion={{...promotion,display:'popup'}} onAction={onAction}/></dialog>;
}
export function CustomerPromotions({promotions,onAction,suspended}:{promotions:Promotion[];onAction:(category?:string)=>void;suspended:boolean}){
 const [popup,setPopup]=useState<Promotion|null>(null),seen=useRef(false);
 useEffect(()=>{
  if(suspended){setPopup(null);return;}
  setPopup(current=>current&&promotions.some(p=>p.id===current.id&&p.display==='popup')?current:null);
  const p=promotions.find(p=>p.display==='popup');if(!p||seen.current)return;
  try{if(sessionStorage.getItem('fond-promotion-popup'))return;}catch{}
  const timer=setTimeout(()=>{seen.current=true;try{sessionStorage.setItem('fond-promotion-popup',p.id);}catch{}setPopup(p);},1200);
  return()=>clearTimeout(timer);
 },[promotions,suspended]);
 return <><section className="customer-promotions" aria-label="Offers at FOND">{promotions.filter(p=>p.display!=='popup').map(p=><PromotionCard key={p.id} promotion={p} onAction={()=>onAction(p.category)}/>)}</section>{popup&&!suspended&&<PromotionPopup promotion={popup} onClose={()=>setPopup(null)} onAction={()=>{setPopup(null);onAction(popup.category);}}/>}</>;
}
