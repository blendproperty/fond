'use client';
import {useEffect,useRef,useState} from 'react';
type Message={subject:string;html:string;text:string;designLabel:string};
export function CouponEmailPreview({message,title}:{message:Message;title:string}){
 const [device,setDevice]=useState<'desktop'|'mobile'>('desktop');
 const [height,setHeight]=useState(1600),observer=useRef<ResizeObserver|null>(null);
 useEffect(()=>()=>observer.current?.disconnect(),[]);
 return <section className="coupon-email-preview" aria-label={title}>
  <div className="coupon-preview-toolbar"><div><strong>{message.designLabel}</strong><span>Design preview only · delivery paused</span></div><div role="group" aria-label="Email preview size"><button type="button" className="outline" aria-pressed={device==='desktop'} onClick={()=>setDevice('desktop')}>Desktop</button><button type="button" className="outline" aria-pressed={device==='mobile'} onClick={()=>setDevice('mobile')}>Mobile</button></div></div>
  <div className="coupon-email-envelope"><p><strong>From</strong> Midpoint Café · FOND</p><p><strong>Subject</strong> {message.subject}</p></div>
  <div className="coupon-email-canvas"><div className={'coupon-email-device '+device}><iframe title={title} srcDoc={message.html} sandbox="allow-same-origin" loading="lazy" referrerPolicy="no-referrer" style={{height}} onLoad={e=>{observer.current?.disconnect();const body=e.currentTarget.contentDocument?.body;if(!body)return;const measure=()=>setHeight(Math.ceil(Math.max(600,body.getBoundingClientRect().height)));observer.current=new ResizeObserver(measure);observer.current.observe(body);measure();}}/></div></div>
  <details><summary>Plain-text fallback</summary><pre>{message.text}</pre></details>
 </section>;
}
