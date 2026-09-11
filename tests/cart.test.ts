import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteCart} from '../src/lib/menu';
import {YocoOrderGateway} from '../src/lib/yoco';
test('quotes trusted catalogue prices in cents',()=>{assert.equal(quoteCart([{id:'avo-eggs',quantity:2},{id:'green',quantity:1}]).reduce((s,l)=>s+l.subtotal,0),18000)});
test('rejects unknown items, duplicate lines and invalid quantities',()=>{for(const lines of [[],[{id:'missing',quantity:1}],[{id:'green',quantity:0}],[{id:'green',quantity:-1}],[{id:'green',quantity:1.5}],[{id:'green',quantity:21}],[{id:'green',quantity:1},{id:'green',quantity:1}]])assert.throws(()=>quoteCart(lines))});
test('Yoco gateway cannot accidentally submit an order',async()=>{await assert.rejects(new YocoOrderGateway().submit({reference:'test',lines:[],collectionTime:'test'}),/pending provider confirmation/)});
