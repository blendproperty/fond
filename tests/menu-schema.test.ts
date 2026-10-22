import {beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {menuJsonLd} from '../src/lib/menu-schema';
import {getAvailableMenu,updateMenuItem} from '../src/lib/menu-store';
import {resetDbForTests} from '../src/lib/db';

process.env.FOND_DB_PATH=':memory:';
beforeEach(()=>resetDbForTests());
const items=(schema:ReturnType<typeof JSON.parse>)=>schema.hasMenuSection.flatMap((section:{hasMenuItem:unknown[]})=>section.hasMenuItem);

test('menu schema matches the entire current catalogue and all photographed food prices/extras',()=>{
 const menu=getAvailableMenu(),schema=JSON.parse(menuJsonLd(menu)),all=items(schema);
 const reference=JSON.parse(readFileSync(new URL('../docs/menu/food-menu-reference-2026-10-08.json',import.meta.url),'utf8'));
 assert.equal(schema['@type'],'Menu');assert.equal(schema.url,'https://midpointhub.com/fond/menu');
 assert.equal(all.length,menu.length);
 for(const meal of menu){
  const item=all.find((item:{identifier:string})=>item.identifier===meal.id);
  assert.equal(item.name,meal.name);assert.equal(item.description,meal.description);
  assert.deepEqual(item.offers,{'@type':'Offer',price:(meal.price/100).toFixed(2),priceCurrency:'ZAR',url:schema.url});
  assert.deepEqual((item.menuAddOn??[]).map((mod:{identifier:string;offers:{price:string}})=>[mod.identifier,mod.offers.price]),(meal.modifiers??[]).filter(m=>m.price>0).map(m=>[m.id,(m.price/100).toFixed(2)]));
 }
 for(const [id,price] of Object.entries(reference.pricesCents))assert.equal(all.find((item:{identifier:string})=>item.identifier===id)?.offers.price,(Number(price)/100).toFixed(2));
 for(const id of reference.removeFromSale)assert.ok(!all.some((item:{identifier:string})=>item.identifier===id));
 assert.equal(all.find((item:{identifier:string})=>item.identifier==='quesadilla').menuAddOn.length,10);
});

test('schema follows live price, special and availability changes without editing schema data',()=>{
 getAvailableMenu();updateMenuItem('three-egg-omelette',{price:6000,isSpecial:true,specialPrice:5000,specialLabel:'Test special'});
 assert.equal(items(JSON.parse(menuJsonLd(getAvailableMenu()))).find((item:{identifier:string})=>item.identifier==='three-egg-omelette').offers.price,'50.00');
 updateMenuItem('three-egg-omelette',{available:false});
 assert.ok(!items(JSON.parse(menuJsonLd(getAvailableMenu()))).some((item:{identifier:string})=>item.identifier==='three-egg-omelette'));
 assert.equal(items(JSON.parse(menuJsonLd([{id:'hidden',name:'Hidden',description:'',category:'Pasta',price:100, symbol:'',available:false}]))).length,0);
});

test('editable item and modifier text cannot escape the JSON-LD script',()=>{
 const text='</script><script>alert("test")</script>';
 const encoded=menuJsonLd([{id:'safe',name:text,description:text,category:'Pasta',price:9550,symbol:'',modifiers:[{id:'extra',name:text,price:50},{id:'remove',name:'No onion',price:0}]}]);
 assert.ok(!encoded.includes('<'));
 const item=items(JSON.parse(encoded))[0];assert.equal(item.name,text);assert.equal(item.menuAddOn[0].name,text);assert.equal(item.menuAddOn.length,1);assert.equal(item.offers.price,'95.50');
});
