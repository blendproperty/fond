import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteCart,FOOD_TRUCK_SECTIONS,foodTruckSection,FOOD_TRUCK_MENU} from '../src/lib/menu';

test('Food Truck drinks use the supplied prices and require exactly one valid flavour',()=>{
 assert.deepEqual(FOOD_TRUCK_SECTIONS,['Build Your Plate','Kotas','Chow for 1','Breakfast','Drinks']);
 const flavours:Record<string,string[]>={
  'truck-drink-soda-2l':['Coke','Sprite','Stoney','Fanta'],
  'truck-drink-soda-300ml':['Coke','Sprite','Stoney','Cream Soda','Coke Zero','Sprite Zero'],
  'truck-drink-juice-350ml':['Apple','Orange','Cranberry'],
 };
 for(const [id,names] of Object.entries(flavours)){
  const item=FOOD_TRUCK_MENU.find(item=>item.id===id)!;
  assert.equal(foodTruckSection(item),'Drinks');
  assert.deepEqual(item.modifiers?.map(mod=>mod.name),names);
  assert.throws(()=>quoteCart([{id,quantity:1}]),/Choose one option for Flavour/);
  assert.throws(()=>quoteCart([{id,quantity:1,modifierIds:item.modifiers!.slice(0,2).map(mod=>mod.id)}]),/Choose one option/);
  for(const option of item.modifiers!){
   const [line]=quoteCart([{id,quantity:2,modifierIds:[option.id]}]);
   assert.equal(line.subtotal,2*item.price);
   assert.equal(line.selectedModifiers[0].name,option.name);
  }
 }
 for(const id of ['truck-drink-monster-500ml','truck-drink-red-bull-250ml','truck-drink-red-bull-sugar-free-250ml']){
  assert.equal(quoteCart([{id,quantity:1}])[0].subtotal,2500);
  assert.equal(foodTruckSection({id}),'Drinks');
 }
});
test('item notes keep portions separate without changing trusted prices',()=>{const lines=quoteCart([{id:'smashed-avo',quantity:1,note:' sauce on the side '},{id:'smashed-avo',quantity:1,note:'No chilli'}]);assert.equal(lines.length,2);assert.equal(lines[0].note,'sauce on the side');assert.equal(lines[0].subtotal,12000);assert.throws(()=>quoteCart([{id:'smashed-avo',quantity:1,note:'x'.repeat(161)}]),/160/);assert.throws(()=>quoteCart([{id:'smashed-avo',quantity:1,note:123 as any}]),/160/);assert.throws(()=>quoteCart([{id:'smashed-avo',quantity:1,note:'same'},{id:'smashed-avo',quantity:1,note:' same '}]),/invalid/);});
test('quotes trusted catalogue prices in cents',()=>{assert.equal(quoteCart([{id:'smashed-avo',quantity:2},{id:'espresso-single',quantity:1}]).reduce((s,l)=>s+l.subtotal,0),27200)});
test('rejects unknown items, duplicate lines and invalid quantities',()=>{for(const lines of [[],[{id:'missing',quantity:1}],[{id:'espresso-single',quantity:0}],[{id:'espresso-single',quantity:-1}],[{id:'espresso-single',quantity:1.5}],[{id:'espresso-single',quantity:21}],[{id:'espresso-single',quantity:1},{id:'espresso-single',quantity:1}]])assert.throws(()=>quoteCart(lines))});


test('kotas require one relish; chip preferences combine without changing prices or portions',()=>{
 const id='truck-kota-russian';
 assert.throws(()=>quoteCart([{id,quantity:1}]),/Choose one option for Kota relish/);
 assert.throws(()=>quoteCart([{id,quantity:1,modifierIds:['truck-kota-dry','truck-kota-chakalaka']}]),/Choose one option/);
 const lines=quoteCart([
  {id,quantity:2,modifierIds:['achar-instead-of-chakalaka','truck-chips-bbq','truck-chips-salt']},
  {id,quantity:1,modifierIds:['truck-kota-dry']},
 ]);
 assert.equal(lines.length,2);assert.equal(lines[0].subtotal,8000);
 assert.deepEqual(lines[0].selectedModifiers.map(mod=>mod.name),['Kota: Atchar','Chips: BBQ','Chips: Salt']);
 for(const id of ['truck-side-small-chips','truck-chow-russian-chips','truck-breakfast-brekkie-bun']) assert.equal(quoteCart([{id,quantity:1,modifierIds:['truck-chips-tomato','truck-chips-vinegar']}])[0].selectedModifiers.length,2);
 assert.throws(()=>quoteCart([{id:'espresso-single',quantity:1,modifierIds:['truck-chips-bbq']}]),/invalid modifier/);
});
