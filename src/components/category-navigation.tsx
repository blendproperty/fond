'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {categories,type Category} from '@/lib/menu';
export function CategoryNavigation({value,onChange}:{value:Category;onChange:(c:Category)=>void}){
 const ref=useRef<HTMLDivElement>(null),[edges,setEdges]=useState({left:false,right:false});
 function update(){const el=ref.current;if(el)setEdges({left:el.scrollLeft>2,right:el.scrollLeft+el.clientWidth<el.scrollWidth-2});}
 useEffect(()=>{const el=ref.current;if(!el)return;const observer=new ResizeObserver(update);observer.observe(el);update();return()=>observer.disconnect();},[]);
 function move(direction:number){const el=ref.current;el?.scrollBy({left:direction*el.clientWidth*.75,behavior:'smooth'});}
 return <div className="category-navigation"><button className="category-arrow" aria-label="Previous menu categories" disabled={!edges.left} onClick={()=>move(-1)}><ChevronLeft/></button><div ref={ref} onScroll={update} className="tabs scroll" role="tablist" aria-label="Menu category">{categories.map(c=><button role="tab" aria-selected={value===c} key={c} onClick={e=>{onChange(c);e.currentTarget.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});}} onKeyDown={e=>{const index=categories.indexOf(c);const next=e.key==='ArrowRight'?(index+1)%categories.length:e.key==='ArrowLeft'?(index-1+categories.length)%categories.length:e.key==='Home'?0:e.key==='End'?categories.length-1:-1;if(next>=0){e.preventDefault();onChange(categories[next]);const button=ref.current?.children[next] as HTMLButtonElement;button?.focus();button?.scrollIntoView({block:'nearest',inline:'nearest'});}}}>{c}</button>)}</div><button className="category-arrow" aria-label="Next menu categories" disabled={!edges.right} onClick={()=>move(1)}><ChevronRight/></button></div>;
}

