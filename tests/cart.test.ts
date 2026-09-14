import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteCart} from '../src/lib/menu';
test('quotes trusted catalogue prices in cents',()=>{assert.equal(quoteCart([{id:'smashed-avo',quantity:2},{id:'espresso-single',quantity:1}]).reduce((s,l)=>s+l.subtotal,0),27200)});
test('rejects unknown items, duplicate lines and invalid quantities',()=>{for(const lines of [[],[{id:'missing',quantity:1}],[{id:'espresso-single',quantity:0}],[{id:'espresso-single',quantity:-1}],[{id:'espresso-single',quantity:1.5}],[{id:'espresso-single',quantity:21}],[{id:'espresso-single',quantity:1},{id:'espresso-single',quantity:1}]])assert.throws(()=>quoteCart(lines))});
