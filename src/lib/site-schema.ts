import type {TradingHours} from './trading-hours';
import type {Meal} from './menu';

export const SITE_URL='https://midpointhub.com';
export const HUB_ID=`${SITE_URL}/#hub`,SITE_ID=`${SITE_URL}/#website`,FOND_ID=`${SITE_URL}/fond#restaurant`,MENU_URL=`${SITE_URL}/fond/menu`,MENU_ID=`${MENU_URL}#menu`;
export const VENUE_ADDRESS='162 Tonetti Street, Halfway House, Midrand';
export const FOND_CUISINE='Café and shisa nyama';
// Published in the Hub footer and legal contact details; do not infer coordinates or ratings.
const address={'@type':'PostalAddress',streetAddress:'162 Tonetti Street, Halfway House',addressLocality:'Midrand',addressRegion:'Gauteng',postalCode:'1685',addressCountry:'ZA'};
export const jsonLd=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c');
type Hours=TradingHours&{contactPhone?:string;priceRange?:string};
export function menuPriceRange(menu:Pick<Meal,'price'|'available'>[]){const prices=menu.filter(item=>item.available!==false&&Number.isFinite(item.price)&&item.price>=0).map(item=>item.price);if(!prices.length)return undefined;const low=Math.min(...prices),high=Math.max(...prices),rand=(cents:number)=>`R${(cents/100).toFixed(2)}`;return low===high?rand(low):`${rand(low)}–${rand(high)}`;}
export function openingHoursSchema(hours:TradingHours){
 const groups=new Map<string,{days:string[];opens:string;closes:string}>(),names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 for(const day of [1,2,3,4,5,6,0]){
  const closes=day===6?hours.saturdayClosingTime:hours.closingTime;if(!hours.openDays.includes(day)||hours.openingTime>=closes)continue;
  const key=`${hours.openingTime}/${closes}`,group=groups.get(key)??{days:[],opens:hours.openingTime,closes};group.days.push(`https://schema.org/${names[day]}`);groups.set(key,group);
 }
 return [...groups.values()].map(group=>({'@type':'OpeningHoursSpecification',dayOfWeek:group.days,opens:group.opens,closes:group.closes}));
}
export function sitePageSchema(page:'hub'|'fond'|'menu',hours?:Hours){
 const path=page==='hub'?'/':page==='fond'?'/fond':'/fond/menu',url=SITE_URL+path;
 const hub={'@type':'LocalBusiness','@id':HUB_ID,name:'Midpoint Hub',url:SITE_URL+'/',address,logo:SITE_URL+'/hub-assets/hub-logo-stacked.svg',image:SITE_URL+'/hub-assets/midpoint-hub-exterior.webp'};
 const site={'@type':'WebSite','@id':SITE_ID,name:'Midpoint Hub',url:SITE_URL+'/',publisher:{'@id':HUB_ID},inLanguage:'en-ZA'};
 const restaurant={'@type':'Restaurant','@id':FOND_ID,name:'FOND Café & Eatery',alternateName:'Midpoint Café powered by FOND',url:SITE_URL+'/fond',address,containedInPlace:{'@id':HUB_ID},hasMenu:MENU_URL,logo:SITE_URL+'/brand/midpoint-cafe-powered-by-fond.png',image:SITE_URL+'/images/fond-hero.jpg',currenciesAccepted:'ZAR',servesCuisine:FOND_CUISINE,...(hours?.priceRange?{priceRange:hours.priceRange}:{}),...(hours?.contactPhone?{telephone:hours.contactPhone}:{}),...(hours?{openingHoursSpecification:openingHoursSchema(hours)}:{})};
 const webpage={'@type':'WebPage','@id':url+'#webpage',url,name:page==='hub'?'Midpoint Hub':page==='fond'?'FOND Café & Eatery':'FOND menu',inLanguage:'en-ZA',isPartOf:{'@id':SITE_ID},about:{'@id':page==='hub'?HUB_ID:FOND_ID},mainEntity:{'@id':page==='hub'?HUB_ID:page==='fond'?FOND_ID:MENU_ID},...(page==='hub'?{}:{breadcrumb:{'@id':url+'#breadcrumb'}})};
 const crumbs=[{name:'Midpoint Hub',url:SITE_URL+'/'},{name:'FOND',url:SITE_URL+'/fond'},...(page==='menu'?[{name:'FOND menu',url:MENU_URL}]:[])];
 return {'@context':'https://schema.org','@graph':[hub,site,...(page==='hub'?[]:[restaurant]),webpage,...(page==='hub'?[]:[{'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:crumbs.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:item.url}))}])]};
}
