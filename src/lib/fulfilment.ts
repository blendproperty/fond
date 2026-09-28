export type CollectionSlot = { value:string; label:string; dateLabel:string };

const ZA_OFFSET_MS=2*60*60*1000;
const toMinutes=(value:string)=>{const [hour,minute]=value.split(':').map(Number);return hour*60+minute;};
const dateKey=(date:Date)=>new Date(date.getTime()+ZA_OFFSET_MS).toISOString().slice(0,10);
const weekday=(date:Date)=>new Date(date.getTime()+ZA_OFFSET_MS).getUTCDay();

export function formatCollectionTime(value:string){
  if(!value||value==='ASAP'||value==='As soon as possible')return 'As soon as possible';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return value;
  return new Intl.DateTimeFormat('en-ZA',{timeZone:'Africa/Johannesburg',weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
}

export function collectionSlots(input:{now?:Date;prepMinutes:number;incrementMinutes:number;openingTime:string;closingTime:string;openDays:number[]}):CollectionSlot[]{
  const now=input.now??new Date(),increment=Math.max(5,input.incrementMinutes),earliest=now.getTime()+Math.max(1,input.prepMinutes)*60000;
  const cursor=new Date(now),key=dateKey(cursor),open=toMinutes(input.openingTime),close=toMinutes(input.closingTime);
  if(!input.openDays.includes(weekday(cursor))||dateKey(new Date(earliest))!==key)return [];
  const earliestLocal=new Date(earliest+ZA_OFFSET_MS),afterPrep=earliestLocal.getUTCHours()*60+earliestLocal.getUTCMinutes();
  if(afterPrep>close)return [];
  const start=Math.max(open,Math.ceil(afterPrep/increment)*increment);
  const slots:CollectionSlot[]=[{value:'As soon as possible',label:`As soon as possible · approx. ${input.prepMinutes} min`,dateLabel:'Today only'}];
  for(let at=start;at<=close;at+=increment){
    const hour=String(Math.floor(at/60)).padStart(2,'0'),minute=String(at%60).padStart(2,'0');
    const value=`${key}T${hour}:${minute}:00+02:00`;
    if(Date.parse(value)<earliest)continue;
    slots.push({value,label:`${hour}:${minute}`,dateLabel:'Today only'});
  }
  return slots;
}

export function validateScheduledCollection(value:string,prepMinutes:number,settings:{collectionSlotIncrementMinutes:number;openingTime:string;closingTime:string;openDays:number[]},now=new Date()){
  const available=collectionSlots({prepMinutes,now,incrementMinutes:settings.collectionSlotIncrementMinutes,openingTime:settings.openingTime,closingTime:settings.closingTime,openDays:settings.openDays});
  if(value==='ASAP'||value==='As soon as possible')return;
  const scheduled=new Date(value);
  if(!Number.isFinite(scheduled.getTime()))return;
  if(!available.some(slot=>slot.value===value))throw new Error('Choose an available collection time for today.');
}

export function deliveryLocationValue(entry:string){
  const [business,...rest]=entry.split('|');
  return {business:business.trim(),building:rest.join('|').trim()};
}
