// Shared by customer checkout and the server; all hours use Johannesburg time.
export type TradingHours = {
  openingTime:string; closingTime:string; openDays:number[];
  saturdayClosingTime:string; foodTruckOpeningTime:string;
  foodTruckClosingTime:string; foodTruckOpenDays:number[];
};
export const johannesburgDay=(now=new Date())=>new Date(now.getTime()+7200000).getUTCDay();
export function tradingWindow(settings:TradingHours,hasFoodTruck=false,now=new Date()) {
  const restaurantClose=johannesburgDay(now)===6?settings.saturdayClosingTime:settings.closingTime;
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
