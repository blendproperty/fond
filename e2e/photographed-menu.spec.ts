import {test,expect} from '@playwright/test';
import reference from '../docs/menu/food-menu-reference-2026-10-08.json';

test('restaurant catalogue matches the photographed menu and retired dishes cannot be ordered',async({request})=>{
 const response=await request.get('/api/menu');expect(response.ok()).toBe(true);
 const {menu}=await response.json();
 const food=menu.filter((m:{id:string})=>Object.hasOwn(reference.pricesCents,m.id));
 expect(Object.fromEntries(food.map((m:{id:string;price:number})=>[m.id,m.price]))).toEqual(reference.pricesCents);
 for(const id of reference.removeFromSale){expect(menu.some((m:{id:string})=>m.id===id)).toBe(false);const result=await request.post('/api/orders',{headers:{'Idempotency-Key':crypto.randomUUID()},data:{customerName:'Retired-item fixture',contactNumber:'0821234567',collectionTime:'ASAP',lines:[{id,quantity:1}]}});expect(result.status()).toBe(400);}
 const omelette=menu.find((m:{id:string})=>m.id==='three-egg-omelette');
 const modifierIds=omelette.modifiers.filter((m:{name:string})=>['Add bacon','Add mushrooms'].includes(m.name)).map((m:{id:string})=>m.id);
 const order=await request.post('/api/orders',{headers:{'Idempotency-Key':crypto.randomUUID()},data:{customerName:'Menu pricing fixture',contactNumber:'0821234567',collectionTime:'ASAP',lines:[{id:omelette.id,quantity:1,modifierIds}]}});
 expect(order.status()).toBe(201);expect((await order.json()).totalCents).toBe(12500);
 expect(menu.some((m:{id:string})=>m.id==='espresso-single')).toBe(true);
 expect(menu.some((m:{category:string})=>m.category==='Food Truck')).toBe(true);
});

test('new pasta, omelette and quesadilla are visible and breakfast extras reach the basket total',async({page},info)=>{
 await page.clock.setFixedTime(new Date('2026-10-22T09:00:00+02:00'));
 await page.goto('/fond/menu');
 await page.getByRole('tab',{name:'Pasta',exact:true}).click();
 await expect(page.getByRole('tabpanel',{name:'Pasta',exact:true}).locator('.meal-card')).toHaveCount(3);
 await expect(page.getByRole('button',{name:'Add Basil Chicken Penne Pasta',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Add Pasta Napoletana',exact:true})).toBeVisible();
 await expect(page.getByRole('tab',{name:'Plates',exact:true})).toHaveCount(0);
 await page.getByRole('tabpanel',{name:'Pasta',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:info.outputPath('corrected-pasta-menu.png')});
 const search=page.getByRole('searchbox',{name:'Search the menu'});
 await search.fill('quesadilla');await page.getByRole('button',{name:'Add Quesadilla',exact:true}).click();
 const quesadilla=page.getByRole('dialog',{name:'Quesadilla',exact:true});await expect(quesadilla.getByRole('checkbox')).toHaveCount(10);await quesadilla.getByRole('button',{name:'Close item'}).click();
 await search.fill('omelette');await page.getByRole('button',{name:'Add 3 Egg Omelette',exact:true}).click();
 const item=page.getByRole('dialog',{name:'3 Egg Omelette',exact:true});
 await item.getByRole('checkbox',{name:/Add bacon/}).check();await item.getByRole('checkbox',{name:/Add mushrooms/}).check();
 await expect(item.getByRole('button',{name:/Add to basket/})).toContainText('125');
 await item.getByRole('button',{name:/Add to basket/}).click();
 await page.getByRole('button',{name:'Basket',exact:true}).click();
 const basket=page.getByRole('dialog',{name:'Your basket'});await expect(basket).toContainText('Add bacon');await expect(basket).toContainText('Add mushrooms');await expect(basket.locator('.cart-line')).toContainText('125');
 await page.screenshot({path:info.outputPath('omelette-with-extras.png')});
});
