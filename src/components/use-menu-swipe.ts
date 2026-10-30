'use client';
import {useRef,type PointerEvent,type MouseEvent} from 'react';

export function useMenuSwipe(onSwipe:(direction:-1|1)=>void,disabled:boolean){
 const start=useRef<{id:number;x:number;y:number;time:number;horizontal:boolean}|null>(null),suppressClick=useRef(false);
 return {
  onPointerDown(event:PointerEvent<HTMLDivElement>){
   suppressClick.current=false;
   if(disabled||event.pointerType==='mouse'||!event.isPrimary||event.clientX<24||event.clientX>window.innerWidth-24||(event.target as Element).closest('input,select,textarea,a,[contenteditable="true"]')){start.current=null;return;}
   start.current={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),horizontal:false};
  },
  onPointerMove(event:PointerEvent<HTMLDivElement>){
   const p=start.current;if(!p||p.id!==event.pointerId)return;
   const dx=Math.abs(event.clientX-p.x),dy=Math.abs(event.clientY-p.y);
   if(!p.horizontal&&dy>16&&dy>=dx){start.current=null;return;}
   if(!p.horizontal&&dx>20&&dx>dy*1.5){p.horizontal=true;suppressClick.current=true;event.currentTarget.setPointerCapture(event.pointerId);}
  },
  onPointerUp(event:PointerEvent<HTMLDivElement>){
   const p=start.current;start.current=null;if(!p||p.id!==event.pointerId||disabled)return;
   const dx=event.clientX-p.x,dy=Math.abs(event.clientY-p.y);
   if(p.horizontal&&Math.abs(dx)>=60&&Math.abs(dx)>dy*1.5&&performance.now()-p.time<1200)onSwipe(dx<0?1:-1);
  },
  onPointerCancel(){start.current=null;},
  // A dish button's implicit touch capture is handed to the grid during a swipe.
  onLostPointerCapture(event:PointerEvent<HTMLDivElement>){if(event.target===event.currentTarget)start.current=null;},
  onClickCapture(event:MouseEvent<HTMLDivElement>){if(suppressClick.current&&event.detail>0){event.preventDefault();event.stopPropagation();suppressClick.current=false;}},
 };
}
