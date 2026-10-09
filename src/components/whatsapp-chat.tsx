'use client';

import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {ArrowUpRight, MessageCircle, X} from 'lucide-react';
import './whatsapp-chat.css';

const chatUrl = `https://wa.me/27690420108?text=${encodeURIComponent('Hi Midpoint Hub, I would like some help please.')}`;

export function WhatsAppChat() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const widget = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), link = useRef<HTMLAnchorElement>(null);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    link.current?.focus();
    function key(event: KeyboardEvent) { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }
    function outside(event: PointerEvent) { if (!widget.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  const privateRoute = /^\/(admin|staff|practice|api)(\/|$)/.test(path) || path.split('/').includes('manage');
  if (privateRoute) return null;
  return <div ref={widget} className="whatsapp-chat">
    {open && <section id="whatsapp-chat-panel" role="dialog" aria-modal="false" aria-labelledby="whatsapp-chat-title" className="whatsapp-chat-panel">
      <header><span className="whatsapp-chat-mark"><MessageCircle size={24} aria-hidden="true"/></span><div><span>MIDPOINT HUB</span><h2 id="whatsapp-chat-title">Let’s chat.</h2></div><button type="button" aria-label="Close WhatsApp chat" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={20}/></button></header>
      <div className="whatsapp-chat-body"><p>A question about FOND or life at Midpoint? Message our team on WhatsApp.</p><a ref={link} href={chatUrl} target="_blank" rel="noopener noreferrer">Continue in WhatsApp <ArrowUpRight size={18} aria-hidden="true"/></a><small>Opens WhatsApp. Send your message there to start the conversation.</small></div>
    </section>}
    <button ref={trigger} type="button" className="whatsapp-chat-trigger" aria-label="Chat on WhatsApp" aria-expanded={open} aria-controls="whatsapp-chat-panel" onClick={() => setOpen(!open)}><MessageCircle size={23} aria-hidden="true"/><span>WhatsApp</span></button>
  </div>;
}
