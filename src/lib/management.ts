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
  enforceHours:false, openingTime:'07:00', closingTime:'17:00', openDays:[1,2,3,4,5],
  maxActiveOrders:100, newOrderMinutes:5, paymentConfirmationMinutes:10,
  yocoEntryMinutes:5, preparationMinutes:20, readyDeliveryMinutes:10, readyCollectionMinutes:10,
  preparationWeightPercent:7,allowTestPayments:false,
  deliveryArea:'Midpoint Hub',
  collectionSlots:['As soon as possible','Breakfast collection','Lunch collection','After-work collection'],
  closedMessage:'Online ordering is currently closed. Please contact FOND.',
  contactPhone:'', whatsappEnabled:false, smsEnabled:false, onlinePaymentsEnabled:false,
};
export type TradingSettings=typeof DEFAULT_SETTINGS;
export const settings=():TradingSettings=>({...DEFAULT_SETTINGS,...document('trading',DEFAULT_SETTINGS)});
export function validateSettings(input:unknown):TradingSettings {
  const s=input as TradingSettings;
  if(!s || typeof s!=='object')throw new Error('Provide trading settings.');
  for(const k of ['orderingEnabled','collectionEnabled','deliveryEnabled','enforceHours','whatsappEnabled','smsEnabled','onlinePaymentsEnabled','allowTestPayments'] as const)if(typeof s[k]!=='boolean')throw new Error('Invalid switch value.');
  for(const k of ['openingTime','closingTime'] as const)if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s[k]))throw new Error('Enter valid opening and closing times.');
  if(s.openingTime>=s.closingTime)throw new Error('Closing time must be after opening time. Overnight trading is not supported.');
  if(!Array.isArray(s.openDays)||!s.openDays.length||s.openDays.some(d=>!Number.isInteger(d)||d<0||d>6))throw new Error('Select trading days.');
  if(!Number.isInteger(s.maxActiveOrders)||s.maxActiveOrders<1||s.maxActiveOrders>1000)throw new Error('Check maximum active orders.');
  for(const k of ['newOrderMinutes','paymentConfirmationMinutes','yocoEntryMinutes','preparationMinutes','readyDeliveryMinutes','readyCollectionMinutes'] as const)if(!Number.isInteger(s[k])||s[k]<1||s[k]>240)throw new Error('Every queue target must be between 1 and 240 minutes.');
  if(!Number.isInteger(s.preparationWeightPercent)||s.preparationWeightPercent<5||s.preparationWeightPercent>8)throw new Error('Preparation weighting must be between 5% and 8%.');
  for(const k of ['deliveryArea','closedMessage','contactPhone'] as const)if(typeof s[k]!=='string'||s[k].length>250)throw new Error('Invalid contact or display text.');
  if(!Array.isArray(s.collectionSlots)||!s.collectionSlots.length||s.collectionSlots.length>12||s.collectionSlots.some(t=>typeof t!=='string'||!t.trim()||t.length>80))throw new Error('Provide 1–12 collection options.');
  return {...DEFAULT_SETTINGS,...s};
}
export function orderingAvailable(s=settings(),now=new Date()) {
  if(!s.orderingEnabled)return false;
  if(!s.enforceHours)return true;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Johannesburg',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const part=(k:string)=>parts.find(p=>p.type===k)?.value??'';
  const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(part('weekday'));
  const time=`${part('hour')}:${part('minute')}`;
  return s.openDays.includes(day)&&time>=s.openingTime&&time<s.closingTime;
}
export function assertTrading(fulfillment:string,source:string) {
  const s=settings();
  if(!orderingAvailable(s))throw new Error(s.closedMessage);
  if(fulfillment==='delivery'&&!s.deliveryEnabled)throw new Error('Delivery is unavailable. Please choose collection.');
  if(fulfillment==='collection'&&!s.collectionEnabled)throw new Error('Collection is unavailable.');
  const count=getDb().prepare("SELECT count(*) AS n FROM orders WHERE status IN ('received','accepted','preparing','ready')").get() as {n:number};
  if(count.n>=s.maxActiveOrders)throw new Error('The kitchen is at capacity. Please try again shortly.');
}
export type Promotion={id:string;title:string;body:string;startsAt:string;endsAt:string;active:boolean;display?:'banner'|'card'|'popup';imageUrl?:string;buttonLabel?:string;category?:string};
export const DEFAULT_CONTENT={headline:'Good food. One less thing to think about.',intro:'From your first meeting to your last set. Fresh breakfast, proper lunch and a little lift. Made for your day at Midpoint.',announcement:'',promotions:[] as Promotion[]};
export type SiteContent=typeof DEFAULT_CONTENT;
export function validateContent(input:unknown):SiteContent {
  const c=input as SiteContent;
  if(!c||typeof c.headline!=='string'||!c.headline.trim()||c.headline.length>120||typeof c.intro!=='string'||c.intro.length>600||typeof c.announcement!=='string'||c.announcement.length>250)throw new Error('Check the headline, introduction and announcement lengths.');
  if(!Array.isArray(c.promotions)||c.promotions.length>20)throw new Error('Maximum 20 promotions.');
  for(const p of c.promotions)if(!p||typeof p.id!=='string'||typeof p.title!=='string'||!p.title.trim()||p.title.length>100||typeof p.body!=='string'||p.body.length>500||typeof p.active!=='boolean'||!Number.isFinite(Date.parse(p.startsAt))||!Number.isFinite(Date.parse(p.endsAt))||Date.parse(p.startsAt)>=Date.parse(p.endsAt))throw new Error('Each promotion needs a title and valid start/end dates.');
  if(new Set(c.promotions.map(p=>p.id)).size!==c.promotions.length)throw new Error('Each promotion must have a unique ID.');
  for(const p of c.promotions){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(p.id)||p.display&&!['banner','card','popup'].includes(p.display))throw new Error('Choose a valid promotion format.');
    if(p.imageUrl && (typeof p.imageUrl!=='string'||!/^\/api\/promotion-images\/[a-f0-9-]{36}$/.test(p.imageUrl)))throw new Error('Use an uploaded promotion image.');
    if(p.display==='card'&&!p.imageUrl)throw new Error('Upload an image for the image card.');
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
