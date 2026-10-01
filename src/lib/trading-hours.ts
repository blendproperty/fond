// Shared by customer checkout and the server; all hours use Johannesburg time.
export type TradingHours = {
  openingTime:string; closingTime:string; openDays:number[];
  saturdayClosingTime:string; foodTruckOpeningTime:string;
  foodTruckClosingTime:string; foodTruckOpenDays:number[];
};
export const johannesburgDay=(now=new Date())=>new Date(now.getTime()+7200000).getUTCDay();
export function tradingWindow(settings:TradingHours,hasFoodTruck=false,now=new Date()) {
  return windowForDay(settings,hasFoodTruck,johannesburgDay(now));
}
function windowForDay(settings:TradingHours,hasFoodTruck:boolean,day:number){
  const restaurantClose=day===6?settings.saturdayClosingTime:settings.closingTime;
  return {
    openingTime:hasFoodTruck?[settings.openingTime,settings.foodTruckOpeningTime].sort().at(-1)!:settings.openingTime,
    closingTime:hasFoodTruck?[restaurantClose,settings.foodTruckClosingTime].sort()[0]:restaurantClose,
    openDays:hasFoodTruck?settings.openDays.filter(day=>settings.foodTruckOpenDays.includes(day)):settings.openDays,
  };
}
export function withinTradingWindow(window:{openingTime:string;closingTime:string;openDays:number[]},now=new Date()) {
  const local=new Date(now.getTime()+7200000);
  const time=`${String(local.getUTCHours()).padStart(2,'0')}:${String(local.getUTCMinutes()).padStart(2,'0')}`;
  return window.openDays.includes(local.getUTCDay())&&time>=window.openingTime&&time<window.closingTime;
}
export const tradingDayNames=(days:number[])=>[1,2,3,4,5,6,0].filter(day=>days.includes(day)).map(day=>['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day]).join(', ')||'Closed every day';

export function orderingHoursMessage(settings:TradingHours & {orderingEnabled:boolean;enforceHours:boolean},now=new Date()){
  if(!settings.orderingEnabled)return 'Ordering paused — contact FOND';
  if(!settings.enforceHours)return 'Taking orders';
  const current=tradingWindow(settings,false,now);
  if(withinTradingWindow(current,now))return `Open until ${current.closingTime}`;
  const local=new Date(now.getTime()+7200000),time=`${String(local.getUTCHours()).padStart(2,'0')}:${String(local.getUTCMinutes()).padStart(2,'0')}`;
  for(let offset=0;offset<=7;offset++){
    const next=new Date(now.getTime()+offset*86400000),window=tradingWindow(settings,false,next);
    if(!window.openDays.includes(johannesburgDay(next))||window.openingTime>=window.closingTime||(offset===0&&time>=window.openingTime))continue;
    const day=offset===0?'today':offset===1?'tomorrow':new Intl.DateTimeFormat('en-ZA',{weekday:'long',timeZone:'Africa/Johannesburg'}).format(next);
    return `Opens ${day} at ${window.openingTime}`;
  }
  return 'No ordering days scheduled';
}

export function weeklyTradingHours(settings:TradingHours,hasFoodTruck=false){
  const names=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],days=[1,2,3,4,5,6,0];
  const groups=new Map<string,number[]>();
  days.forEach((day,index)=>{
    const window=windowForDay(settings,hasFoodTruck,day);
    const hours=window.openDays.includes(day)&&window.openingTime<window.closingTime?`${window.openingTime}–${window.closingTime}`:'closed';
    groups.set(hours,[...(groups.get(hours)??[]),index]);
  });
  return [...groups].map(([hours,indices])=>{
    const ranges:string[]=[];
    for(let i=0;i<indices.length;i++){const first=indices[i];let last=first;while(indices[i+1]===last+1)last=indices[++i];ranges.push(first===last?names[first]:`${names[first]}–${names[last]}`);}
    return `${ranges.join(', ')} ${hours}`;
  }).join(' · ');
}
