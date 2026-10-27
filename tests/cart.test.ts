import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteCart} from '../src/lib/menu';
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
