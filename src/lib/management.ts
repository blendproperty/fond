import {tradingWindow,withinTradingWindow} from './trading-hours';
import { categories } from './menu';
import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import {documentSnapshot,recordAdminChange,VERSIONED_DOCUMENT_KEYS} from './change-history';

export function document<T>(key:string, fallback:T):T {
  const row=getDb().prepare('SELECT value FROM app_documents WHERE key=?').get(key) as {value:string}|undefined;
  return row ? JSON.parse(row.value) : fallback;
}
export function audit(actor:string,action:string,target:string) {
  getDb().prepare('INSERT INTO admin_events VALUES (?,?,?,?,?)').run(randomUUID(),actor,action,target,new Date().toISOString());
}
export function saveDocument(key:string,value:unknown,actor:string) {
  const db=getDb(),before=VERSIONED_DOCUMENT_KEYS.has(key)?documentSnapshot(key):null;
  db.exec('SAVEPOINT save_admin_document');
  try{
    db.prepare('INSERT INTO app_documents VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').run(key,JSON.stringify(value),new Date().toISOString());
    if(VERSIONED_DOCUMENT_KEYS.has(key))recordAdminChange({actor,area:'document',entityId:key,action:before==null?'create':'update',before,after:value as never});
    audit(actor,'save',key);db.exec('RELEASE save_admin_document');
  }catch(error){db.exec('ROLLBACK TO save_admin_document');db.exec('RELEASE save_admin_document');throw error;}
}
export const DEFAULT_SETTINGS = {
  orderingEnabled:true, collectionEnabled:true, deliveryEnabled:true,
  enforceHours:false, openingTime:'07:00', closingTime:'18:30', foodTruckClosingTime:'15:30', openDays:[1,2,3,4,5,6],
  saturdayClosingTime:'12:00', foodTruckOpeningTime:'07:00', foodTruckOpenDays:[1,2,3,4,5],
  maxActiveOrders:100, newOrderMinutes:5, paymentConfirmationMinutes:10,
  yocoEntryMinutes:5, preparationMinutes:20, readyDeliveryMinutes:10, readyCollectionMinutes:10,
  preparationWeightPercent:7,preparationParallelItems:2,preparationParallelOrders:2,allowTestPayments:false,
  deliveryArea:'Midpoint Hub',
  collectionSlotIncrementMinutes:15,
  deliveryLocations:[
    'Blend Property Group | OnPoint Building · 2 Loerie','Blend Property Management | K8 · Kingfisher Avenue','Bidvest Bank | S3 · Sunbird Road','Care Call Retail and Distribution Services | H1 · Hornbill Lane','City of Johannesburg Metropolitan Municipality | K9 · Kingfisher Road','Crysbol | L1 · Loerie Road','Deli South Africa | S3 · Sunbird Road / W5 · Weaver Avenue','Epsidon Management & Marketing Consultancy | L2 · Loerie Road','Even Flow Distribution | K8 · Kingfisher Avenue','First Coast Technologies | ST1 · Starling Crescent','Fresenius Kabi S.A. | K7 · Kingfisher Avenue','Galito’s Holdings | H3 · Hornbill Lane','Gobiosis International | ST1 · Starling Crescent','Gofresh Retail Solutions | C1 · Canary','Healthcare and Mobility Africa | S3 · Sunbird Road','IT and E | H1 · Hornbill Lane','Le Morgan Direct Marketing | L1 · Loerie Road','LG Electronics SA | K3 · Kingfisher Avenue','LNS Orthopaedics | OnPoint · L2-1-06','Makokga Attorneys and Administrators of Estate | S3 · Sunbird Road','MBT Automotive | C1 · Canary','Momentum Metropolitan Life | W5 · Weaver Avenue','Mrwebi Property Group | L1 · Loerie Road','Omolefe Holdings | OnPoint · L2-1-01','Penguin Random House South Africa | K4 · Kingfisher Avenue / W1 · Weaver Avenue','Phakamo Holdings | H3 · Hornbill Lane','Redington South Africa | OnPoint · L2-1-08','Redington South Africa Distribution | OnPoint · L2-1-09','Resilient Innovations | L3 · Loerie Road','SANBS | L1 · Loerie Road','South Africa Atess Power Technology | K9 · Kingfisher Road','SPG | W3 · Weaver Avenue','SPX Flow Technology | W4 · Weaver Avenue','Stellantis South Africa | H2 · Hornbill Lane','Studio at Lifestyle | ST1 · Starling Crescent','Syntegon Technology South Africa | K4 · Kingfisher Avenue','Technologia Group | K1 · Kingfisher Avenue','Tenova South Africa | H3 · Hornbill Lane','Ubunye Uniforms | H1 · Hornbill Lane','Vehicle Security Association of SA | H1 · Hornbill Lane'
  ],
  closedMessage:'Online ordering is currently closed. Please contact FOND.',
  contactPhone:'', whatsappEnabled:false, smsEnabled:false, onlinePaymentsEnabled:false,
};
export type TradingSettings=typeof DEFAULT_SETTINGS;
export const settings=():TradingSettings=>({...DEFAULT_SETTINGS,...document('trading',DEFAULT_SETTINGS)});
export function validateSettings(input:unknown):TradingSettings {
  const s=input as TradingSettings;
  if(!s || typeof s!=='object')throw new Error('Provide trading settings.');
  for(const k of ['orderingEnabled','collectionEnabled','deliveryEnabled','enforceHours','whatsappEnabled','smsEnabled','onlinePaymentsEnabled','allowTestPayments'] as const)if(typeof s[k]!=='boolean')throw new Error('Invalid switch value.');
  for(const k of ['openingTime','closingTime','saturdayClosingTime','foodTruckOpeningTime','foodTruckClosingTime'] as const)if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s[k]))throw new Error('Enter valid opening and closing times.');
  if(s.openingTime>=s.closingTime)throw new Error('Closing time must be after opening time. Overnight trading is not supported.');
  if(Array.isArray(s.openDays)&&s.openDays.includes(6)&&s.saturdayClosingTime<=s.openingTime)throw new Error('Saturday closing time must be after restaurant opening time.');
  if(s.foodTruckOpeningTime>=s.foodTruckClosingTime)throw new Error('Food Truck closing time must be after its opening time.');
  for(const key of ['openDays','foodTruckOpenDays'] as const)if(!Array.isArray(s[key])||s[key].some(d=>!Number.isInteger(d)||d<0||d>6)||new Set(s[key]).size!==s[key].length)throw new Error('Select valid trading days.');
  for(const day of s.foodTruckOpenDays){
    const close=day===6?s.saturdayClosingTime:s.closingTime;
    if(!s.openDays.includes(day)||s.foodTruckOpeningTime<s.openingTime||s.foodTruckClosingTime>close)throw new Error('Food Truck hours must fall within restaurant hours on each selected day.');
  }
  if(!Number.isInteger(s.maxActiveOrders)||s.maxActiveOrders<1||s.maxActiveOrders>1000)throw new Error('Check maximum active orders.');
  for(const k of ['newOrderMinutes','paymentConfirmationMinutes','yocoEntryMinutes','preparationMinutes','readyDeliveryMinutes','readyCollectionMinutes'] as const)if(!Number.isInteger(s[k])||s[k]<1||s[k]>240)throw new Error('Every queue target must be between 1 and 240 minutes.');
  if(!Number.isInteger(s.collectionSlotIncrementMinutes)||s.collectionSlotIncrementMinutes<5||s.collectionSlotIncrementMinutes>60||s.collectionSlotIncrementMinutes%5!==0)throw new Error('Collection time increments must be between 5 and 60 minutes, in steps of 5.');
  if(!Number.isInteger(s.preparationWeightPercent)||s.preparationWeightPercent<5||s.preparationWeightPercent>8)throw new Error('Preparation weighting must be between 5% and 8%.');
  if(!Number.isInteger(s.preparationParallelItems)||s.preparationParallelItems<1||s.preparationParallelItems>10)throw new Error('Parallel items per order must be between 1 and 10.');
  if(!Number.isInteger(s.preparationParallelOrders)||s.preparationParallelOrders<1||s.preparationParallelOrders>10)throw new Error('Parallel kitchen orders must be between 1 and 10.');
  for(const k of ['deliveryArea','closedMessage','contactPhone'] as const)if(typeof s[k]!=='string'||s[k].length>250)throw new Error('Invalid contact or display text.');
  if(!Array.isArray(s.deliveryLocations)||!s.deliveryLocations.length||s.deliveryLocations.length>200||s.deliveryLocations.some(t=>typeof t!=='string'||!t.includes('|')||!t.split('|')[0].trim()||!t.split('|').slice(1).join('|').trim()||t.length>180))throw new Error('Provide delivery locations as Business | Building.');
  return {...DEFAULT_SETTINGS,...s};
}
export function orderingAvailable(s=settings(),now=new Date()) {
  if(!s.orderingEnabled)return false;
  if(!s.enforceHours)return true;
  return withinTradingWindow(tradingWindow(s,false,now),now);
}
export function assertTrading(fulfillment:string,source:string) {
  const s=settings();
  if(!orderingAvailable(s))throw new Error(s.closedMessage);
  if(fulfillment==='delivery'&&!s.deliveryEnabled)throw new Error('Delivery is unavailable. Please choose collection.');
  if(fulfillment==='collection'&&!s.collectionEnabled)throw new Error('Collection is unavailable.');
  const count=getDb().prepare("SELECT count(*) AS n FROM orders WHERE status IN ('received','accepted','preparing','ready')").get() as {n:number};
  if(count.n>=s.maxActiveOrders)throw new Error('The kitchen is at capacity. Please try again shortly.');
}
export type Promotion={id:string;title:string;body:string;startsAt:string;endsAt:string;active:boolean;display?:'banner'|'card'|'popup'|'image-popup';imageUrl?:string;buttonLabel?:string;category?:string};
export const DEFAULT_CONTENT={headline:'Good food. One less thing to think about.',intro:'From your first meeting to your last set. Fresh breakfast, proper lunch and a little lift. Made for your day at Midpoint.',announcement:'',promotions:[] as Promotion[]};
export type SiteContent=typeof DEFAULT_CONTENT;
export function validateContent(input:unknown):SiteContent {
  const c=input as SiteContent;
  if(!c||typeof c.headline!=='string'||!c.headline.trim()||c.headline.length>120||typeof c.intro!=='string'||c.intro.length>600||typeof c.announcement!=='string'||c.announcement.length>250)throw new Error('Check the headline, introduction and announcement lengths.');
  if(!Array.isArray(c.promotions)||c.promotions.length>20)throw new Error('Maximum 20 promotions.');
  for(const p of c.promotions)if(!p||typeof p.id!=='string'||typeof p.title!=='string'||!p.title.trim()||p.title.length>100||typeof p.body!=='string'||p.body.length>500||typeof p.active!=='boolean'||!Number.isFinite(Date.parse(p.startsAt))||!Number.isFinite(Date.parse(p.endsAt))||Date.parse(p.startsAt)>=Date.parse(p.endsAt))throw new Error('Each promotion needs a title and valid start/end dates.');
  if(new Set(c.promotions.map(p=>p.id)).size!==c.promotions.length)throw new Error('Each promotion must have a unique ID.');
  for(const p of c.promotions){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)||p.display&&!['banner','card','popup','image-popup'].includes(p.display))throw new Error('Choose a valid promotion format.');
    if(p.imageUrl && (typeof p.imageUrl!=='string'||!/^\/api\/promotion-images\/[a-f0-9-]{36}$/.test(p.imageUrl)))throw new Error('Use an uploaded promotion image.');
    if((p.display==='card'||p.display==='image-popup')&&!p.imageUrl)throw new Error('Upload an image for this promotion.');
    if(p.display==='image-popup'&&!p.body.trim())throw new Error('Describe the image offer for customers using screen readers.');
    if(p.buttonLabel!=null&&(typeof p.buttonLabel!=='string'||p.buttonLabel.length>40))throw new Error('Button text is limited to 40 characters.');
    if(p.category&&!categories.includes(p.category as typeof categories[number]))throw new Error('Choose an existing menu category.');
  }
  return {...c,promotions:c.promotions.map(p=>({...p,startsAt:new Date(p.startsAt).toISOString(),endsAt:new Date(p.endsAt).toISOString()}))};
}
export function publicContent() {
  const c=document('content-published',DEFAULT_CONTENT),now=new Date().toISOString();
  return {...c,promotions:c.promotions.filter(p=>p.active&&p.startsAt<=now&&p.endsAt>now)};
}
export function normalizePhone(value:string) {
  let p=value.replace(/[\s()-]/g,'');
  if(/^0\d{9}$/.test(p))p='+27'+p.slice(1);
  if(!/^\+\d{8,15}$/.test(p))throw new Error('Use a valid phone number, for example +27 followed by the number.');
  return p;
}
