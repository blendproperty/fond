import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sitePageSchema,openingHoursSchema,menuPriceRange,jsonLd,HUB_ID,SITE_ID,FOND_ID,MENU_ID,MENU_URL} from '../src/lib/site-schema';
import {menuJsonLd} from '../src/lib/menu-schema';
import {DEFAULT_SETTINGS} from '../src/lib/management';

test('Hub describes its actual venue, website and canonical homepage without invented ratings or opening hours',()=>{
 const data=sitePageSchema('hub'),nodes=data['@graph'],hub=nodes.find(n=>n['@id']===HUB_ID)!,site=nodes.find(n=>n['@id']===SITE_ID)!;
 assert.equal(hub['@type'],'LocalBusiness');assert.match(jsonLd(hub),/162 Tonetti Street/);assert.match(jsonLd(hub),/1685/);assert.equal(site['@type'],'WebSite');assert.equal(nodes.filter(n=>n['@type']==='WebPage').length,1);assert.equal(nodes.length,3);assert.doesNotMatch(jsonLd(data),/aggregateRating|review|geo|openingHours|SearchAction/);
});
test('FOND page and menu graphs link to one restaurant, canonical website, business hours and breadcrumb hierarchy',()=>{
 for(const page of ['fond','menu'] as const){
  const nodes=sitePageSchema(page,{...DEFAULT_SETTINGS,contactPhone:'+27662205519'})['@graph'],restaurant=nodes.find(n=>n['@id']===FOND_ID)!,webpage=nodes.find(n=>n['@type']==='WebPage')!,crumb=nodes.find(n=>n['@type']==='BreadcrumbList')!;
  assert.equal(restaurant['@type'],'Restaurant');assert.match(jsonLd(restaurant),/\+27662205519/);assert.match(jsonLd(restaurant),/"hasMenu":"https:\/\/midpointhub.com\/fond\/menu"/);assert.match(jsonLd(restaurant),/OpeningHoursSpecification/);assert.match(jsonLd(webpage),new RegExp(page==='menu'?'#menu':'#restaurant'));assert.equal((crumb as {itemListElement:unknown[]}).itemListElement.length,page==='menu'?3:2);assert.equal(new Set(nodes.map(n=>n['@id'])).size,nodes.length);
 }
 const menu=JSON.parse(menuJsonLd([]));assert.equal(menu['@id'],MENU_ID);assert.equal(menu.url,MENU_URL);assert.equal(menu.provider['@id'],FOND_ID);
});
test('opening hours follow edited weekday, Saturday and closed-day settings without marking closed days open',()=>{
 const hours=openingHoursSchema({...DEFAULT_SETTINGS,openingTime:'08:30',closingTime:'17:00',saturdayClosingTime:'11:00',openDays:[1,3,6]});
 assert.deepEqual(hours,[{'@type':'OpeningHoursSpecification',dayOfWeek:['https://schema.org/Monday','https://schema.org/Wednesday'],opens:'08:30',closes:'17:00'},{'@type':'OpeningHoursSpecification',dayOfWeek:['https://schema.org/Saturday'],opens:'08:30',closes:'11:00'}]);assert.deepEqual(openingHoursSchema({...DEFAULT_SETTINGS,openDays:[]}),[]);assert.deepEqual(openingHoursSchema({...DEFAULT_SETTINGS,openingTime:'18:30',closingTime:'18:30'}),[]);
});
test('all in-page entity references resolve across business and menu blocks, and editable phone text is script-safe',()=>{
 const graph=sitePageSchema('menu',{...DEFAULT_SETTINGS,contactPhone:'</script><script>alert(1)</script>'}),menu=JSON.parse(menuJsonLd([]));const ids=new Set([...graph['@graph'].map(n=>n['@id']),menu['@id']]);
 function walk(value:unknown){if(!value||typeof value!=='object')return;const o=value as Record<string,unknown>;if(Object.keys(o).length===1&&typeof o['@id']==='string')assert.ok(ids.has(o['@id']),o['@id']);for(const child of Object.values(o))if(Array.isArray(child))child.forEach(walk);else walk(child);}
 walk(graph);walk(menu);assert.ok(!jsonLd(graph).includes('<'));assert.match(jsonLd(graph),/\\u003c/);
});
test('public price ranges reflect current available prices and do not advertise sold-out or invalid prices',()=>{
 assert.equal(menuPriceRange([{price:5500},{price:12000},{price:99999,available:false},{price:NaN}]),'R55.00–R120.00');assert.equal(menuPriceRange([{price:5500}]),'R55.00');assert.equal(menuPriceRange([]),undefined);
 const graph=sitePageSchema('menu',{...DEFAULT_SETTINGS,priceRange:'R55.00–R120.00'});assert.match(jsonLd(graph),/"priceRange":"R55.00–R120.00"/);assert.match(jsonLd(graph),/"servesCuisine":"Café and shisa nyama"/);
});
