import {test,expect} from '@playwright/test';
import reference from '../docs/menu/food-menu-reference-2026-10-08.json';

test('server-rendered menu JSON-LD contains current dishes, ZAR prices and paid extras without retired items',async({request,page})=>{
 const response=await request.get('/fond/menu');expect(response.ok()).toBe(true);
 const html=await response.text();
 const blocks=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)];
 expect(blocks).toHaveLength(1);
 const schema=JSON.parse(blocks[0][1]);expect(schema['@type']).toBe('Menu');expect(schema.url).toBe('https://midpointhub.com/fond/menu');
 const items=schema.hasMenuSection.flatMap((section:{hasMenuItem:any[]})=>section.hasMenuItem);
 for(const [id,price] of Object.entries(reference.pricesCents)){
  const item=items.find((item:{identifier:string})=>item.identifier===id);
  expect(item?.offers.price,id).toBe((price/100).toFixed(2));expect(item?.offers.priceCurrency).toBe('ZAR');
 }
 for(const id of reference.removeFromSale)expect(items.some((item:{identifier:string})=>item.identifier===id)).toBe(false);
 const omelette=items.find((item:{identifier:string})=>item.identifier==='three-egg-omelette');
 expect(Object.fromEntries(omelette.menuAddOn.map((item:{name:string;offers:{price:string}})=>[item.name,Number(item.offers.price)*100]))).toEqual(reference.breakfastAndQuesadillaExtrasCents);
 await page.goto('/fond/menu');await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
 await page.getByRole('searchbox',{name:'Search the menu'}).fill('omelette');
 await expect(page.locator('.meal-card')).toContainText('3 Egg Omelette');await expect(page.locator('.meal-card')).toContainText('55');
});
