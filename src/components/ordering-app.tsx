'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { ArrowRight, Check, Clock3, Coffee, Leaf, MapPin, Minus, Plus, ShoppingBag, Truck, Utensils, X, Download, Search, UserRound, ArrowLeft } from 'lucide-react';
import { money, quoteCart, lineKey, categories, FOOD_TRUCK_SECTIONS, foodTruckSection, type CartLine, type Category, type FoodTruckSection, type Meal } from '@/lib/menu';

import {CategoryNavigation} from './category-navigation';
import {CustomerPromotions} from './promotions';
import {BrandLogo} from './brand-logo';
import {HubScene} from './hub-scene';
import './fond-ordering.css';
import './fond-experience.css';
import {HubAppNav} from './hub-app-nav';
import {EcosystemHeader} from './ecosystem-shell';
import {FondFoodArt} from './fond-food-art';
import {FondItemDialog} from './fond-item-dialog';
import { submissionKey, clearSubmission } from '@/lib/submission';
import {basketPrepMinutes} from '@/lib/preparation-estimates';
import {tradingWindow,withinTradingWindow,tradingDayNames,orderingHoursMessage,weeklyTradingHours} from '@/lib/trading-hours';
import {collectionSlots,deliveryLocationValue,formatCollectionTime} from '@/lib/fulfilment';
import {deliveryPinPreview,validateDeliveryLocation,type DeliveryLocation} from '@/lib/delivery-location';
import {savedOrders,SAVED_ORDERS_KEY,type SavedOrder} from '@/lib/saved-orders';

import type { TradingSettings,SiteContent } from '@/lib/management';


type Confirmation = { reference: string; displayReference:string; total: number; collection: string; fulfillment: Fulfillment;estimatedPrepMinutes:number };
type TrackedOrder = { payment?: {paidCents:number;checkout:string|null}; paymentMethod?:'yoco_online'|'pay_at_collection';fulfillment?:Fulfillment;reference: string;displayReference:string; status: string; totalCents: number; collectionTime: string;estimatedPrepMinutes:number;updatedAt:string;estimatedArrivalAt:string|null };
type Fulfillment = 'collection' | 'delivery';
type CustomerSession = { email: string };

function statusLabel(order:TrackedOrder){
  if(order.status==='ready')return order.fulfillment==='delivery'?'Ready for delivery — waiting for dispatch':'Ready for collection';
  if(order.status==='out_for_delivery')return 'Out for delivery';
  if(order.status==='completed')return order.fulfillment==='delivery'?'Delivered':'Collected';
  return ({received:'Received — waiting for FOND to accept',accepted:'Accepted — being prepared',preparing:'Preparing in the kitchen',cancelled:'Cancelled'} as Record<string,string>)[order.status]??order.status;
}
function timingLabel(order:TrackedOrder){
  if(order.status==='out_for_delivery'&&order.estimatedArrivalAt)return `Expected by ${new Date(order.estimatedArrivalAt).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}`;
  if(order.status==='ready')return order.fulfillment==='delivery'?'Your order is packed; the delivery ETA starts when it leaves FOND.':`Ready now · ${formatCollectionTime(order.collectionTime)}`;
  if(['completed','cancelled'].includes(order.status))return order.fulfillment==='delivery'?'Delivery update':'Collection update';
  return `${formatCollectionTime(order.collectionTime)} · approx. ${order.estimatedPrepMinutes} min preparation`;
}

export function OrderingApp({premium=false}:{premium?:boolean}) {
  useEffect(()=>{if(premium)window.scrollTo(0,0);},[premium]);
  const [store,setStore]=useState<{settings:TradingSettings;content:SiteContent;open:boolean;onlinePayments:boolean;paymentMode?:'live'|'sandbox'|'none';queueDelayMinutes?:number}|null>(null);
  useEffect(()=>{const timer=setInterval(()=>{fetch('/api/store').then(r=>r.json()).then(setStore).catch(()=>{});},60000);return()=>clearInterval(timer);},[]);
  const rewardVersion=useRef(0);
  const [rewardCode,setRewardCode]=useState(''),[appliedReward,setAppliedReward]=useState(''),[rewardDiscount,setRewardDiscount]=useState(0),[rewardMessage,setRewardMessage]=useState(''),[rewardBusy,setRewardBusy]=useState(false);
  const [paymentError,setPaymentError]=useState('');
  const [paying,setPaying]=useState(false);
  const [menu, setMenu] = useState<Meal[]>([]);
  const [category, setCategory] = useState<Category>(categories[0]);
  const [menuSearch,setMenuSearch]=useState('');
  const [foodTruckMenu, setFoodTruckMenu] = useState<FoodTruckSection>('Build Your Plate');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pendingMods, setPendingMods] = useState<Record<string, string[]>>({});
  const [selectedItem,setSelectedItem]=useState<Meal|null>(null);
  const [panel, setPanel] = useState<'basket' | 'track' | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>('collection');
  const [collection, setCollection] = useState('As soon as possible');
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [company, setCompany] = useState('');
  const [building, setBuilding] = useState('');
  const [deliveryLocation,setDeliveryLocation]=useState('');
  const [gpsPin,setGpsPin]=useState<DeliveryLocation|null>(null);
  const [gpsConfirmed,setGpsConfirmed]=useState(false);
  const [gpsBusy,setGpsBusy]=useState(false);
  const [gpsError,setGpsError]=useState('');
  const gpsRequest=useRef(0);
  const [customerEmail, setCustomerEmail] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [note, setNote] = useState('');
  const [placedReferences, setPlacedReferences] = useState<SavedOrder[]>([]);
  const savedOrderList=useRef<SavedOrder[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');
  const [reorderMessage,setReorderMessage]=useState('');
  const reorderLoaded=useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);

  const [offline, setOffline] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [tracked, setTracked] = useState<TrackedOrder | null>(null);
  const [trackError, setTrackError] = useState('');
  const [trackLocked,setTrackLocked]=useState(false);
  const [trackBusy,setTrackBusy]=useState(false);
  const trackRequest=useRef(0);

  function rememberOrder(lookup:string,label:string){
    const next=savedOrders([{lookup,label,savedAt:Date.now()},...savedOrderList.current.filter(order=>order.lookup!==lookup)]);
    savedOrderList.current=next;setPlacedReferences(next);
    try{localStorage.setItem(SAVED_ORDERS_KEY,JSON.stringify(next));}catch{/* Tracking still works when browser storage is unavailable. */}
    setTrackInput(label);setTrackLocked(true);
  }

  function openTracking(){
    setPanel('track');setTrackError('');
    const latest=savedOrderList.current[0];
    if(latest){setTrackInput(latest.label);setTrackLocked(true);void lookupOrder(latest.lookup);}
  }

  function clearGps(){gpsRequest.current++;setGpsPin(null);setGpsConfirmed(false);setGpsBusy(false);setGpsError('');}
  useEffect(()=>{if(fulfillment!=='delivery')clearGps();},[fulfillment]);
  useEffect(()=>()=>{gpsRequest.current++;trackRequest.current++;},[]);

  function useMyLocation(){
    clearGps();
    if(!window.isSecureContext||!navigator.geolocation){setGpsError('Location is unavailable here. Use your business and building details instead.');return;}
    const request=++gpsRequest.current;setGpsBusy(true);
    try{navigator.geolocation.getCurrentPosition(position=>{
      if(request!==gpsRequest.current)return;
      try{setGpsPin(validateDeliveryLocation({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy}));}
      catch{setGpsError('Could not get a usable delivery pin. Try again or use your building details.');}
      setGpsBusy(false);
    },error=>{
      if(request!==gpsRequest.current)return;
      setGpsBusy(false);setGpsError(error.code===1?'Location permission was declined. You can still order using your business and building.':error.code===3?'Finding your location timed out. Try again or use your building details.':'Could not find your location. Try again or use your building details.');
    },{enableHighAccuracy:true,timeout:15000,maximumAge:0});}catch{setGpsBusy(false);setGpsError('Location is unavailable here. Use your business and building details instead.');}
  }

  useEffect(() => {
    try{const recent=savedOrders(JSON.parse(localStorage.getItem(SAVED_ORDERS_KEY)??'[]'));savedOrderList.current=recent;setPlacedReferences(recent);if(recent[0]){setTrackInput(recent[0].label);setTrackLocked(true);}localStorage.setItem(SAVED_ORDERS_KEY,JSON.stringify(recent));}catch{/* Ignore malformed or unavailable browser storage. */}
    fetch('/api/store').then(r=>r.json()).then(data=>{setStore(data);setCollection('As soon as possible');if(!data.settings.collectionEnabled&&data.settings.deliveryEnabled)setFulfillment('delivery');}).catch(()=>{});
    fetch('/api/auth/session').then(r=>r.json()).then(data=>{const user=data.user as CustomerSession|null;if(user?.email)setCustomerEmail(user.email);setEmailOptIn(true);}).catch(()=>setEmailOptIn(true));

    const params=new URLSearchParams(location.search);if(params.has('payment')&&params.get('reference')){setPanel('track');setTrackInput(params.get('reference')!);void lookupOrder(params.get('reference')!);}else if(params.get('view')==='track')openTracking();if(params.get('mode')==='delivery')setFulfillment('delivery');
    fetch('/api/menu').then((r) => r.json()).then((data) => setMenu(data.menu ?? [])).catch(() => {});
  }, []);

  useEffect(()=>{if(store?.settings.whatsappEnabled===false)setWhatsappOptIn(false);},[store?.settings.whatsappEnabled]);

  useEffect(()=>{const reference=new URLSearchParams(location.search).get('reorder');if(!reference||!menu.length||reorderLoaded.current)return;reorderLoaded.current=true;let cancelled=false;fetch('/api/account/orders',{cache:'no-store'}).then(async r=>{if(!r.ok)throw new Error('Sign in to reorder from your history.');return r.json();}).then(data=>{if(cancelled)return;const order=data.orders?.find((o:{reference:string})=>o.reference===reference);if(!order)throw new Error('This order is not in your account history.');const lines:CartLine[]=order.lines.filter((l:CartLine)=>{const meal=menu.find(m=>m.id===l.id&&m.available!==false);return meal&&(l.modifierIds??[]).every(id=>meal.modifiers?.some(m=>m.id===id));}).map((l:CartLine)=>({id:l.id,quantity:l.quantity,modifierIds:l.modifierIds,note:l.note}));if(lines.length)quoteCart(lines,menu);setCart(lines);setReorderMessage(lines.length===order.lines.length?'Your previous items are in the basket at current prices. Review options and notes before ordering.':'Some previous items or options are unavailable. Available items are in your basket at current prices.');}).catch(e=>{if(!cancelled)setReorderMessage(e instanceof Error?e.message:'Could not load the previous order.');});return()=>{cancelled=true;reorderLoaded.current=false;};},[menu]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    const connectivity = () => setOffline(!navigator.onLine);
    window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity); connectivity();
    return () => { window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); };
  }, []);

  useEffect(() => {
    if (!panel) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
      if (e.key === 'Tab') {
        const elements = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled), [role="dialog"] select, [role="dialog"] input, [role="dialog"] a[href]'));
        const first = elements[0], last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', close);
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = previous; previousFocus?.focus(); };
  }, [panel]);

  const count = cart.reduce((n, l) => n + l.quantity, 0);
  // Safe pricing for live UI totals: quoteCart throws on an empty or
  // momentarily-invalid basket (e.g. mid-edit), so wrap it rather than
  // reimplement modifier pricing here.
  function priceCart(lines: CartLine[]) {
    if (!lines.length) return [];
    try { return quoteCart(lines, menu); } catch { return []; }
  }
  const pricedCart = priceCart(cart);
  const total = pricedCart.reduce((n, l) => n + l.subtotal, 0)-rewardDiscount;
  useEffect(()=>{rewardVersion.current++;setAppliedReward('');setRewardDiscount(0);},[cart,store?.paymentMode]);
  async function applyReward(){const version=++rewardVersion.current;setRewardBusy(true);setRewardMessage('');try{const r=await fetch('/api/account/rewards',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'quote',code:rewardCode,lines:cart})}),d=await r.json();if(version!==rewardVersion.current)return;if(!r.ok)throw new Error(d.message);setAppliedReward(rewardCode.trim());setRewardDiscount(d.discountCents);setRewardMessage('Free coffee applied. Extras remain payable.');}catch(e){setAppliedReward('');setRewardDiscount(0);setRewardMessage((e as Error).message);}finally{setRewardBusy(false);}}
  const foodTruckIds=useMemo(()=>new Set(menu.filter(item=>item.category==='Food Truck').map(item=>item.id)),[menu]);
  const hasFoodTruck=cart.some(line=>foodTruckIds.has(line.id));
  const hours=store?.settings??{openingTime:'07:00',closingTime:'18:30',saturdayClosingTime:'12:00',openDays:[1,2,3,4,5,6],foodTruckOpeningTime:'07:00',foodTruckClosingTime:'15:30',foodTruckOpenDays:[1,2,3,4,5]};
  const truckWindow=tradingWindow(hours,true);
  const orderWindow=tradingWindow(hours,hasFoodTruck);
  const foodTruckClosingTime=truckWindow.closingTime;
  const orderClosingTime=orderWindow.closingTime;
  const foodTruckAvailable=!store?.settings.enforceHours||withinTradingWindow(truckWindow);
  const restaurantAvailable=store?.open!==false&&(!store?.settings.enforceHours||withinTradingWindow(tradingWindow(hours)));
  const basketPreparationMinutes=pricedCart.length?basketPrepMinutes(pricedCart,store?.settings.preparationWeightPercent??7,store?.settings.preparationParallelItems??2):(store?.settings.preparationMinutes??20);
  const queueDelayMinutes=store?.queueDelayMinutes??0;
  const estimatedPrepMinutes=basketPreparationMinutes+queueDelayMinutes;
  const collectionOptions=collectionSlots({prepMinutes:estimatedPrepMinutes,incrementMinutes:store?.settings.collectionSlotIncrementMinutes??15,...orderWindow});
  const collectionGroups=useMemo(()=>collectionOptions.reduce<{label:string;slots:typeof collectionOptions}[]>((groups,slot)=>{const group=groups.find(item=>item.label===slot.dateLabel);if(group)group.slots.push(slot);else groups.push({label:slot.dateLabel,slots:[slot]});return groups;},[]),[collectionOptions]);
  useEffect(()=>{if(!collectionOptions.some(option=>option.value===collection))setCollection(collectionOptions[0]?.value??'');},[collection,collectionOptions]);

  function toggleModifier(mealId: string, modifierId: string) {
    setPendingMods((current) => {
      const selected = current[mealId] ?? [];
      const next = selected.includes(modifierId) ? selected.filter((id) => id !== modifierId) : [...selected, modifierId];
      return { ...current, [mealId]: next };
    });
  }

  function change(id: string, delta: number, modifierIds?: string[], note?:string) {
    setConfirmation(null); setError('');
    setCart((current) => {
      const key = lineKey({ id, quantity: 1, modifierIds, note });
      const existing = current.find((l) => lineKey(l) === key);
      const qty = existing?.quantity ?? 0;
      const next = Math.max(0, Math.min(20, qty + delta));
      const rest = current.filter((l) => lineKey(l) !== key);
      return [...rest, ...(next ? [{ id, quantity: next, modifierIds: modifierIds?.length ? modifierIds : undefined, note:note?.trim()||undefined }] : [])];
    });
  }

  function lineQuantity(mealId: string, modifierIds?: string[]) {
    const key = lineKey({ id: mealId, quantity: 1, modifierIds });
    return cart.find((l) => lineKey(l) === key)?.quantity ?? 0;
  }

  async function placeOrder() {
    if (sending.current) return;
    setError('');
    const normalizedEmail=customerEmail.trim().toLowerCase();
    try {
      if (store && !store.open) throw new Error(store.settings.closedMessage);
      if (offline) throw new Error('Reconnect before continuing.');
      quoteCart(cart, menu);
      if(rewardCode.trim()&&!appliedReward)throw new Error('Apply your coffee code again after changing the basket, or remove it.');
      if (!customerName.trim()) throw new Error('Enter your name so FOND knows who this is for.');
      if (!contactNumber.trim()) throw new Error('Enter a contact number so FOND can reach you about your order.');
      if(hasFoodTruck&&!foodTruckAvailable)throw new Error(`Food Truck ordering is closed. Trading days: ${tradingDayNames(hours.foodTruckOpenDays)}.`);
      if(fulfillment==='collection'&&!collectionOptions.length)throw new Error(`Today's collection window has closed. ${hasFoodTruck?'The Food Truck':'The kitchen'} closes at ${orderClosingTime}.`);
      if(normalizedEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))throw new Error('Enter a valid email address, or leave the optional email field blank.');
      if (fulfillment === 'delivery') {
        if(gpsBusy)throw new Error('Wait for your location, or remove it and use your building details.');
        if(gpsPin&&!gpsConfirmed)throw new Error('Confirm the delivery pin, or remove it to use your building details only.');
        if (!building.trim()) throw new Error('Enter the building/office to deliver to.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please check your basket.');
      return;
    }
    sending.current = true;
    setSubmitting(true);
    try {
      const paymentMethod='pay_at_collection';
      const payload = JSON.stringify({rewardCode:appliedReward||undefined,lines:cart,collectionTime:collection,customerName,note,fulfillment,paymentMethod,contactNumber:contactNumber || null,company:company || null,building:building || null,deliveryLocation:fulfillment==='delivery'&&gpsConfirmed?gpsPin:null,customerEmail:normalizedEmail||null,whatsappOptIn:store?.settings.whatsappEnabled?whatsappOptIn:false,smsOptIn,emailOptIn:emailOptIn&&!!normalizedEmail});
      const key = await submissionKey(payload);
      const res = await fetch('/api/orders', {method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:payload});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not place that order.');
      clearSubmission(key);
      rememberOrder(data.reference,data.displayReference);
      clearGps();
      if(data.redirectUrl){location.assign(data.redirectUrl);return;}
      setConfirmation({ reference: data.reference, displayReference:data.displayReference, total: data.totalCents, collection, fulfillment,estimatedPrepMinutes:data.estimatedPrepMinutes });
      setCart([]);
      setNote('');
      setRewardCode('');setAppliedReward('');setRewardDiscount(0);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not place that order. Please try again.');
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  async function pay(reference:string) {
    if(paying)return;
    setPaying(true);setPaymentError('');
    try{const r=await fetch('/api/payments/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reference})});const d=await r.json();if(!r.ok)throw new Error(d.message);location.assign(d.redirectUrl);}catch(e){setPaymentError((e as Error).message);}finally{setPaying(false);}
  }

  async function lookupOrder(reference: string) {
    const request=++trackRequest.current;
    setTrackError(''); setTracked(null);
    if (!reference.trim()) return;
    setTrackBusy(true);
    try{
      const res = await fetch(`/api/orders?reference=${encodeURIComponent(reference.trim())}`,{cache:'no-store'});
      const data = await res.json();
      if(request!==trackRequest.current)return;
      if (!res.ok) { setTrackError(data.message ?? 'Order not found.'); return; }
      rememberOrder(data.reference,data.displayReference);setTracked(data);
    }catch{if(request===trackRequest.current)setTrackError('Could not check your order. Check your connection and try again.');}
    finally{if(request===trackRequest.current)setTrackBusy(false);}
  }

  const searchTerm=menuSearch.trim().toLowerCase();
  const highlightMenu=['smashed-avo','brekkie-bun','flat-white'].map(id=>menu.find(m=>m.id===id&&m.available!==false)).filter((m):m is Meal=>!!m);
  const visibleMenu = menu.filter((item) => searchTerm ? `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(searchTerm) : item.category === category && (category !== 'Food Truck' || foodTruckSection(item) === foodTruckMenu));

  return <div className={`fond-ordering-app ${premium?'fond-premium':''}`}>
    <a className="fond-hub-back" href="/hub" aria-label="Back to Midpoint Hub"><ArrowLeft size={15}/> Midpoint Hub</a>
    {premium?<EcosystemHeader service="FOND" back="/fond"/>:<header className="header fond-order-header"><a href="/fond" className="brand-link" aria-label="Midpoint Cafe home">{premium?<img src="/hub-assets/hub-logo.png" alt="Midpoint Hub" className="brand-logo-header"/>:<BrandLogo className="brand-logo-header" />}</a><div className="location"><MapPin size={16} /><div><strong>Midpoint Hub</strong><small>Your everyday food stop</small></div></div><nav className="fond-header-actions" aria-label="FOND account navigation"><a className="quiet" href="/account">My account</a><a className="quiet" href="/rewards">Coffee rewards</a><button className="quiet" onClick={openTracking}><Search size={18} /> Track order</button><button className="basket-button" aria-label="Basket" onClick={() => setPanel('basket')}><ShoppingBag size={18} /><span>Basket</span><b>{count}</b></button></nav></header>}
    <main id="main">
      <section className="fond-order-start" aria-label="Start your order">{premium?<div className="fond-menu-title"><h1>FOND menu</h1><a href="/fond">About FOND <ArrowRight size={14}/></a></div>:<div className="fond-welcome-card"><div className="fond-welcome-copy"><p className="eyebrow">GOOD DAYS START WITH SOMETHING GOOD</p><h1>First, something<br/><em>delicious.</em></h1><p>A proper coffee. A bite from FOND. A little pause that makes the rest of your day better.</p><a href="#menu">Grab a bite <ArrowRight size={16}/></a></div><div className="fond-welcome-art"><HubScene kind="coffee"/><img src="/hub-assets/original/fond-corrected.png" alt="FOND Café & Eatery" width="240" height="240"/><span>YOUR DAILY<br/>GOOD THING</span></div></div>}<div className="fond-service-status"><span className={`fond-trading-pill ${store&&restaurantAvailable?'is-open':''}`} role="status">{!store?'Checking hours…':restaurantAvailable?'Taking orders':'Currently closed'}</span>{store&&(!premium||orderingHoursMessage(store.settings)!==(restaurantAvailable?'Taking orders':'Currently closed'))&&<strong className="fond-opening-time">{orderingHoursMessage(store.settings)}</strong>}</div>{store&&<div className="fond-trading-hours" aria-label="Trading hours"><p><strong>FOND</strong> {weeklyTradingHours(store.settings)}</p><p><strong>Food Truck</strong> {weeklyTradingHours(store.settings,true)}</p><small>South African time</small></div>}<div className="fond-order-mode" role="group" aria-label="Choose how to get your order"><button aria-pressed={fulfillment==='collection'} disabled={!store||store.settings.collectionEnabled===false} onClick={()=>setFulfillment('collection')}><ShoppingBag size={18}/>Collection</button><button aria-pressed={fulfillment==='delivery'} disabled={!store||store.settings.deliveryEnabled===false} onClick={()=>{setFulfillment('delivery');}}><Truck size={18}/>Delivery</button></div><p className="fond-order-location"><MapPin size={15}/>{fulfillment==='collection'?'Collect from FOND · Midpoint Hub':store?.settings.deliveryArea||'Delivery to supported Midpoint businesses'}<span>{fulfillment==='collection'?'Choose your time in the basket':'Choose your building in the basket'}</span></p>{store&&(!store.settings.deliveryEnabled)&&<p className="fond-mode-help">Delivery is currently unavailable. Collection is available when ordering is open.</p>}</section>
      {store?.content.announcement&&<div className="store-announcement">{store.content.announcement}</div>}
      {reorderMessage&&<p className="store-announcement" role="status">{reorderMessage}</p>}
      {store&&!store.open&&<div role="status" className="store-announcement">{store.settings.closedMessage}</div>}
      {store?.onlinePayments&&store?.paymentMode==='sandbox'&&<div role="status" className="sandbox-payment-banner"><strong>YOCO TEST PAYMENT MODE</strong><span>No real money will be charged. Orders and payment confirmations are for controlled FOND testing only.</span></div>}
      <CustomerPromotions promotions={store?.content.promotions??[]} suspended={!!panel||!!confirmation} onAction={target=>{if(target&&categories.includes(target as Category)){setCategory(target as Category);setMenuSearch('');}document.getElementById('menu')?.scrollIntoView({behavior:'smooth'});}}/>
      <section id="menu" className="menu-section"><div className="section-top"><div><p className="eyebrow">YOUR NEXT FAVOURITE</p><h2>What sounds good?</h2></div></div>
        <div className="fond-menu-search"><Search size={19}/><input type="search" aria-label="Search the menu" placeholder="Find a dish, coffee or craving" value={menuSearch} onChange={e=>setMenuSearch(e.target.value)}/>{menuSearch&&<button aria-label="Clear menu search" onClick={()=>setMenuSearch('')}><X size={18}/></button>}</div>
        <div className="menu-toolbar"><CategoryNavigation value={category} onChange={value=>{setCategory(value);setMenuSearch('');}}/></div>
        {searchTerm&&<p className="fond-search-count" role="status">{visibleMenu.length} {visibleMenu.length===1?'match':'matches'} for “{menuSearch.trim()}”</p>}
        {!searchTerm&&category==='Food Truck'&&<div className="food-truck-intro"><span className="food-truck-intro-icon" aria-hidden="true"><Truck size={26}/></span><div><p className="eyebrow">FOND SHISA NYAMA</p><h3>Food Truck Menu</h3><p>Built for delivery or collection. Choose a complete favourite, or build a plate with separate protein, sides and sauce.</p><p><strong>Food Truck orders close at {hours.foodTruckClosingTime}.</strong> {tradingDayNames(hours.foodTruckOpenDays)} · from {hours.foodTruckOpeningTime}.</p></div></div>}
        {!searchTerm&&category==='Food Truck'&&<div className="food-truck-subnav tabs" role="tablist" aria-label="Food Truck menu section">{FOOD_TRUCK_SECTIONS.map(section=><button key={section} role="tab" aria-selected={foodTruckMenu===section} onClick={()=>setFoodTruckMenu(section)}>{section}</button>)}</div>}
        {premium?<>        {!searchTerm&&<div className="fond-favourites"><h2>A few favourites</h2><div>{(highlightMenu.length?highlightMenu:menu.filter(m=>m.available!==false).slice(0,3)).map(m=><button key={m.id} onClick={()=>setSelectedItem(m)}><span className="fond-favourite-art"><FondFoodArt meal={m}/></span><b>{m.name}</b><small>{money(m.price)}</small></button>)}</div></div>}
        <h2 className="fond-category-heading">{searchTerm?'Search results':category}</h2>
        <div className="meal-grid" role="tabpanel" aria-label={searchTerm?'Menu search results':category==='Food Truck'?`Food Truck · ${foodTruckMenu}`:category}>{visibleMenu.map(m=><article className="meal-card" key={m.id}><div className="meal-content"><h3><button className="fond-item-name" onClick={()=>setSelectedItem(m)}>{m.name}</button></h3><p>{m.description}</p>{m.available===false&&<p className="fond-sold-out">Sold out</p>}<div className="meal-bottom"><strong>{money(m.price)}{m.isSpecial&&m.basePrice?<span className="was-price"> {money(m.basePrice)}</span>:null}</strong><button className="add" aria-label={`Add ${m.name}`} disabled={m.available===false||!restaurantAvailable||(m.category==='Food Truck'&&!foodTruckAvailable)} onClick={()=>setSelectedItem(m)}><Plus size={18}/><span>{m.available===false?'Sold out':!restaurantAvailable?'Closed':'Add'}</span></button></div></div><button className="meal-art" aria-label={`View ${m.name}`} onClick={()=>setSelectedItem(m)}><FondFoodArt meal={m}/>{(m.isSpecial||m.diet)&&<span className="meal-tag">{m.isSpecial?(m.specialLabel||'Special'):m.diet!.join(' · ')}</span>}</button></article>)}</div>
        {!searchTerm&&<div className="fond-category-directory"><h2>Explore the menu</h2>{categories.map(c=><button key={c} onClick={()=>{setCategory(c);document.getElementById('menu')?.scrollIntoView({behavior:'smooth'});}}>{c}<ArrowRight size={15}/></button>)}</div>}
</>:        <div className="meal-grid" role="tabpanel" aria-label={searchTerm?'Menu search results':category==='Food Truck'?`Food Truck · ${foodTruckMenu}`:category}>{visibleMenu.map((m) => { const selectedMods = pendingMods[m.id] ?? []; const modPriceSum = (m.modifiers ?? []).filter((mod) => selectedMods.includes(mod.id)).reduce((n, mod) => n + mod.price, 0); const qty = lineQuantity(m.id, selectedMods); return <article className="meal-card" key={m.id}><div className="meal-art"><div className="food-symbol" aria-hidden="true">{m.symbol}</div>{(m.isSpecial || m.diet) && <span className="meal-tag">{m.isSpecial ? (m.specialLabel || 'Special') : m.diet!.join(' · ')}</span>}</div><div className="meal-content"><h3>{m.name}</h3><p>{m.description}</p>
          <p className="meal-prep">Approx. {Math.ceil((m.prepMinutes??10)*(1+(store?.settings.preparationWeightPercent??7)/100))} min preparation</p>{!!m.modifiers?.length && <div className="meal-modifiers">{m.modifiers.map((mod) => <label className="modifier-check" key={mod.id}><input type="checkbox" checked={selectedMods.includes(mod.id)} onChange={() => toggleModifier(m.id, mod.id)} /> {mod.name}{mod.price !== 0 ? ` (${mod.price > 0 ? '+' : ''}${money(mod.price)})` : ''}</label>)}</div>}
          <div className="meal-bottom"><strong>{money(m.price + modPriceSum)}{m.isSpecial && m.basePrice ? <span className="was-price"> {money(m.basePrice)}</span> : null}</strong><button className="add" aria-label={`Add ${m.name}`} disabled={!restaurantAvailable||(m.category==='Food Truck'&&!foodTruckAvailable)} onClick={() => change(m.id, 1, selectedMods)}><Plus size={18} /> {!restaurantAvailable||(m.category==='Food Truck'&&!foodTruckAvailable)?'Closed':`Add${qty ? ` (${qty})` : ''}`}</button></div></div></article>; })}</div>
}        {searchTerm&&!visibleMenu.length&&<div className="fond-search-empty"><Search size={26}/><h3>No matches just yet.</h3><p>Try another dish or browse a category.</p><button className="outline" onClick={()=>setMenuSearch('')}>Browse the menu</button></div>}
        <p className="allergen-note">Our food is prepared in an environment that handles gluten and nuts. Please contact FOND about allergies before ordering.</p></section>

    </main>
    <footer className="fond-public-footer"><a className="brand-link" href="/fond" aria-label="Midpoint Cafe home"><BrandLogo className="brand-logo-footer" /></a><span>Good food. Everyday.</span><a href="/hub">Midpoint Hub</a><a href="mailto:ray@midpointhub.com">Contact Ray</a><a href="/hub/privacy">Privacy policy</a><a href="/hub/terms">Terms and conditions</a>{store?.settings.contactPhone&&<a href={`tel:${store.settings.contactPhone.replace(/[^+0-9]/g,'')}`}>{store.settings.contactPhone}</a>}</footer>
    {offline && <div className="offline" role="status">You&rsquo;re offline. Reconnect to continue.</div>}
    {(!premium||count>0)&&<button className="mobile-basket" aria-label="Basket" onClick={() => setPanel('basket')}><ShoppingBag size={18} /> View basket ({count}) <strong>{money(total)}</strong></button>}
    {premium?<HubAppNav/>:<nav className="fond-app-nav" aria-label="FOND app navigation"><a href="#menu" aria-label="Menu"><Utensils size={20}/><span>Menu</span></a><a href="/rewards" aria-label="Coffee rewards"><Coffee size={20}/><span>Rewards</span></a><button aria-label="Track order" onClick={openTracking}><Search size={20}/><span>Track order</span></button><a href="/account" aria-label="My account"><UserRound size={20}/><span>Account</span></a></nav>}
    {selectedItem&&<FondItemDialog key={selectedItem.id} meal={selectedItem} available={restaurantAvailable&&(selectedItem.category!=='Food Truck'||foodTruckAvailable)} onClose={()=>setSelectedItem(null)} onAdd={(quantity,modifiers,itemNote)=>change(selectedItem.id,quantity,modifiers,itemNote)}/>}
    {panel && <div className="overlay" onClick={() => setPanel(null)}><section className="drawer" role="dialog" aria-modal="true" aria-label={panel === 'basket' ? 'Your basket' : 'Track your order'} onClick={(e) => e.stopPropagation()}>
      <header><div><p className="eyebrow">FOND · MIDPOINT</p><h2>{panel === 'basket' ? 'Your basket' : 'Track your order'}</h2></div><button autoFocus className="icon-button" aria-label="Close" onClick={() => setPanel(null)}><X /></button></header>
      <div className="drawer-scroll">
        {panel === 'track' ? <>
          <label className="field">Order number<input readOnly={trackLocked} value={trackInput} onChange={(e) => setTrackInput(e.target.value)} placeholder="FOND-7K3P-9Q8R" /></label>
          <button className="primary full" disabled={trackBusy||!trackInput.trim()} onClick={() => lookupOrder(trackLocked?(savedOrderList.current.find(order=>order.label===trackInput)?.lookup??trackInput):trackInput)}><Search size={18} /> {trackBusy?'Checking…':'Check status'}</button>{trackLocked&&<button className="quiet" onClick={()=>{trackRequest.current++;setTrackBusy(false);setTrackLocked(false);setTrackInput('');setTracked(null);setTrackError('');}}>Track another order</button>}
          {trackError && <p role="alert">{trackError}</p>}
          {tracked && <div className="notice order-tracking-result" style={{ marginTop: 16 }}><span className="tracking-order-label">YOUR ORDER NUMBER</span><strong>{tracked.displayReference}</strong><p className="tracking-status">{statusLabel(tracked)}</p><p>{timingLabel(tracked)} · {money(tracked.totalCents)}</p><p>{tracked.totalCents===0?'Covered by a coffee reward':(tracked.payment?.paidCents??0)>=tracked.totalCents?(store?.paymentMode==='sandbox'?"Paid in Yoco test mode":"Paid online"):tracked.paymentMethod==='yoco_online'?"Waiting for confirmed Yoco payment":(tracked.fulfillment==='delivery'?"Payment due by card on delivery":"Payment due at collection")}</p><button className="quiet" onClick={()=>lookupOrder(tracked.reference)}>Refresh status</button>{store?.onlinePayments&&tracked.totalCents>0&&(tracked.payment?.paidCents??0)===0&&tracked.status!=="cancelled"&&<button className="primary" disabled={paying} onClick={()=>pay(tracked.reference)}>{store.paymentMode==='sandbox'?'Open Yoco TEST payment':'Pay securely with Yoco'}</button>}{paymentError&&<p role="alert">{paymentError}</p>}</div>}
          {placedReferences.length > 0 && <div style={{ marginTop: 24 }}><p className="small">Recent orders on this device</p>{placedReferences.map((order) => <button key={order.lookup} className="outline" style={{ marginTop: 8, marginRight: 8 }} onClick={() => lookupOrder(order.lookup)}>{order.label}</button>)}</div>}
        </> : confirmation ? <div className="confirmation"><span className="check"><Check /></span><h3>Order sent to FOND.</h3><p className="small">Quote this order number</p><p className="reference">{confirmation.displayReference}</p><p>{confirmation.fulfillment === 'delivery' ? 'Delivery' : formatCollectionTime(confirmation.collection)}</p><strong>{money(confirmation.total)}</strong><p>Estimated preparation: approximately {confirmation.estimatedPrepMinutes} minutes.</p><p className="notice">{confirmation.total===0?'Your coffee reward covers this order. No payment is due.':confirmation.fulfillment==='delivery'?'Pay by card when your order arrives. Our delivery team will bring the Yoco card machine.':'Payment is due at FOND when you collect. Staff will confirm the order and record it in the restaurant system.'}</p>{paymentError&&<p role="alert">{paymentError}</p>}<button className="primary" onClick={() => { setPanel(null); setConfirmation(null); }}>Back to the menu <ArrowRight size={18} /></button></div> : cart.length ? <>
          {pricedCart.map((l) => <div className="cart-line" key={lineKey({ id: l.id, quantity: l.quantity, modifierIds: l.selectedModifiers.map((mod) => mod.id), note:l.note })}><span className="cart-art" aria-hidden="true">{l.symbol}</span><div><h3>{l.name}</h3><p>{money(l.unitPrice)}{l.selectedModifiers.length > 0 && <span className="cart-line-mods"> · {l.selectedModifiers.map((mod) => mod.name).join(', ')}</span>}</p>{l.note&&<p className="fond-line-note"><strong>Item note:</strong> {l.note}</p>}<div className="quantity"><button aria-label={`Remove one ${l.name}`} onClick={() => change(l.id, -1, l.selectedModifiers.map((mod) => mod.id),l.note)}><Minus size={14} /></button><span>{l.quantity}</span><button disabled={l.quantity >= 20} aria-label={`Add one ${l.name}`} onClick={() => change(l.id, 1, l.selectedModifiers.map((mod) => mod.id),l.note)}><Plus size={14} /></button></div></div><strong>{money(l.subtotal)}</strong></div>)}
          <div className="fulfillment-toggle" role="tablist" aria-label="Collection or delivery">
            <button role="tab" aria-selected={fulfillment === 'collection'} disabled={store?.settings.collectionEnabled===false} onClick={() => setFulfillment('collection')}><ShoppingBag size={16} /> Collection</button>
            <button role="tab" aria-selected={fulfillment === 'delivery'} disabled={store?.settings.deliveryEnabled===false} onClick={() => {setFulfillment('delivery');}}><Truck size={16} /> Delivery</button>
          </div>
          {hasFoodTruck&&!foodTruckAvailable&&<p className="notice" role="alert">Food Truck ordering is closed. Trading days: {tradingDayNames(hours.foodTruckOpenDays)}.</p>}
          <label className="field">Your name<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="So FOND knows who this is for" /></label>
          {fulfillment === 'collection' ? (
            <label className="field">Preferred collection time (today)<select value={collection} disabled={!collectionOptions.length} onChange={(e) => setCollection(e.target.value)}>{!collectionOptions.length&&<option value="">Today&rsquo;s collection window has closed</option>}{collectionGroups.map(group=><optgroup label={group.label} key={group.label}>{group.slots.map(slot=><option value={slot.value} key={slot.value}>{slot.label}</option>)}</optgroup>)}</select><span className="small">Today only · {hasFoodTruck?'Food Truck':'Kitchen'} closes at {orderClosingTime}.</span></label>
          ) : <>
            <label className="field">Contact number<input required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="For FOND to reach you about your order" inputMode="tel" autoComplete="tel" /></label>
            <label className="field">Business and building<select value={deliveryLocation} onChange={event=>{const value=event.target.value;setDeliveryLocation(value);clearGps();if(value&&value!=='other'){const location=deliveryLocationValue(value);setCompany(location.business);setBuilding(location.building);}else{setCompany('');setBuilding('');}}}><option value="">Select your business and building</option>{(store?.settings.deliveryLocations??[]).map(location=><option value={location} key={location}>{deliveryLocationValue(location).business} — {deliveryLocationValue(location).building}</option>)}<option value="other">My business is not listed</option></select></label>
            {deliveryLocation==='other'&&<><label className="field">Business name<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your business" /></label><label className="field">Building / office<input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Building, unit or floor" /></label></>}
            <section className="delivery-gps" aria-label="Delivery location">
              <h3>Delivery pin (optional)</h3>
              <p className="small">Use this while you are at the delivery point. FOND will receive the confirmed pin with this order. Your business and building are still required; add your floor or desk in the note below.</p>
              <button className="outline" disabled={gpsBusy} onClick={useMyLocation}><MapPin size={16}/>{gpsBusy?'Finding your location…':'Use my location'}</button>
              {gpsError&&<p role="alert">{gpsError}</p>}
              {gpsPin&&<><p role="status">Location found · accuracy approximately {Math.ceil(gpsPin.accuracy)} m.{gpsPin.accuracy>100?' This may be imprecise. Check the pin carefully or remove it.':''}</p><a href={deliveryPinPreview(gpsPin)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Check pin in Google Maps ↗</a><p className="small">Opening the map shares this pin with Google.</p><label className="field-check"><input type="checkbox" checked={gpsConfirmed} onChange={event=>setGpsConfirmed(event.target.checked)}/> This is the correct delivery point. Include it with my order.</label></>}
              {(gpsPin||gpsBusy)&&<button className="quiet" onClick={clearGps}>Remove location</button>}
            </section>
          </>}
          {fulfillment==='collection'&&<label className="field">Contact number<input required value={contactNumber} onChange={e=>setContactNumber(e.target.value)} placeholder="For FOND to reach you about your order" inputMode="tel" autoComplete="tel"/></label>}
          <label className="field">Email address (optional)<input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} placeholder="For coffee rewards, receipts and order updates" autoComplete="email" /></label>
          {store?.settings.smsEnabled&&<label className="field-check"><input type="checkbox" checked={smsOptIn} onChange={e=>setSmsOptIn(e.target.checked)} disabled={!contactNumber.trim()}/> SMS me when my order is accepted and ready</label>}
          <label className="field-check"><input type="checkbox" checked={emailOptIn} onChange={e=>setEmailOptIn(e.target.checked)}/> Email me when my order is received and ready</label>
          <label className={`field-check${store?.settings.whatsappEnabled?'':' notification-unavailable'}`}><input type="checkbox" checked={whatsappOptIn} onChange={e=>setWhatsappOptIn(e.target.checked)} disabled={!contactNumber.trim()||!store?.settings.whatsappEnabled}/> {store?.settings.whatsappEnabled?'WhatsApp me when my order is accepted and ready':'WhatsApp notifications unavailable — setup pending'}</label>
          {store&&<p className="small">This basket is estimated at approximately {estimatedPrepMinutes} minutes based on its items and quantities{queueDelayMinutes?`, including ${queueDelayMinutes} minutes for the current kitchen queue`:''}. {fulfillment==='delivery'&&store.settings.deliveryArea}</p>}
          <fieldset className="payment-choice"><legend>Payment</legend><label className="field-check" style={{color:'#888',opacity:0.65}}><input type="radio" name="payment" disabled checked={false} readOnly/> Pay online with Yoco — temporarily unavailable</label><label className="field-check"><input type="radio" name="payment" checked readOnly/> {fulfillment==='delivery'?'Pay by card on delivery':'Pay at FOND when collecting'}</label><p className="small">{fulfillment==='delivery'?'Our delivery team will bring the Yoco card machine. Pay when your order arrives.':'Pay when you collect your order at FOND.'}</p></fieldset>
          <label className="field">Order note (optional)<input maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Allergy, desk number, special request…" /></label>
          <section className="basket-rewards"><h3>Coffee rewards</h3><p>Buy 10 coffees while signed in with a verified email and get one free on your next order. <a href="/rewards">Your rewards</a></p><label className="field">Free-coffee code<input value={rewardCode} maxLength={40} onChange={e=>{rewardVersion.current++;setRewardCode(e.target.value);setAppliedReward('');setRewardDiscount(0);setRewardMessage('');}} placeholder="COFFEE-…"/></label><button className="outline" disabled={rewardBusy||!rewardCode.trim()} onClick={applyReward}>Apply coffee code</button>{rewardMessage&&<p role="status">{rewardMessage}</p>}{rewardDiscount>0&&<p>Free coffee: −{money(rewardDiscount)}</p>}</section>
          <div className="total"><span>Total</span><strong>{money(total)}</strong></div>
          {error && <p role="alert">{error}</p>}
          <p className="small">Before ordering, read our <a href="/hub/terms" target="_blank" rel="noopener noreferrer">Terms and conditions (opens a new tab)</a> and <a href="/hub/privacy" target="_blank" rel="noopener noreferrer">Privacy policy (opens a new tab)</a>.</p>
          <button className="primary full" disabled={offline || submitting || !restaurantAvailable || (hasFoodTruck&&!foodTruckAvailable) || (fulfillment==='collection'&&!collectionOptions.length)} onClick={placeOrder}>{submitting ? 'Sending…' : total===0?'Redeem free coffee':'Send order to FOND'} <ArrowRight size={18} /></button>
          <p className="small center">{fulfillment==='delivery'?'Payment is due by card on delivery.':'Payment is due when you collect.'}</p>
        </> : <div className="empty"><ShoppingBag /><h3>A little something good?</h3><p>Your basket is waiting for its first favourite.</p><button className="primary" onClick={() => setPanel(null)}>Explore the menu <ArrowRight size={18} /></button></div>}
      </div>
    </section></div>}
  </div>;
}
