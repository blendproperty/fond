import type {Meal} from './menu';
import {FOND_ID,MENU_URL,MENU_ID,jsonLd} from './site-schema';

const offer=(price:number)=>({'@type':'Offer',price:(price/100).toFixed(2),priceCurrency:'ZAR',url:MENU_URL});

// Use the live catalogue, including effective special prices, rather than a second price list.
export function menuJsonLd(menu:Meal[]){
 const sections=new Map<string,Meal[]>();
 for(const item of menu){
  if(item.available===false)continue;
  const section=sections.get(item.category)??[];
  section.push(item);sections.set(item.category,section);
 }
 const schema={
  '@context':'https://schema.org',
  '@type':'Menu',
  '@id':MENU_ID,
  name:'FOND menu',
  url:MENU_URL,
  provider:{'@id':FOND_ID},
  inLanguage:'en-ZA',
  hasMenuSection:Array.from(sections,([name,items])=>({
   '@type':'MenuSection',name,
   hasMenuItem:items.map(item=>({
    '@type':'MenuItem',identifier:item.id,name:item.name,description:item.description,
    offers:offer(item.price),
    ...(item.modifiers?.some(mod=>mod.price>0)?{menuAddOn:item.modifiers.filter(mod=>mod.price>0).map(mod=>({
     '@type':'MenuItem',identifier:mod.id,name:mod.name,
     description:'Optional add-on; price is added to the base dish.',offers:offer(mod.price),
    }))}:{})
   })),
  })),
 };
 // Escape editable menu text so it cannot close the JSON-LD script element.
 return jsonLd(schema);
}
