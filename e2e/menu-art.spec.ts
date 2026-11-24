import {test,expect} from '@playwright/test';

test('menu illustrations remain visible behind compact dietary labels and match dish types',async({page})=>{
 await page.goto('/fond/menu');
 const search=page.getByRole('searchbox',{name:'Search the menu'});
 for(const [name,kind] of [['Smashed Avo','generated illustration'],['Brekkie Bun','food photo'],['3 Egg Omelette','generated illustration'],['Pasta Napoletana','generated illustration'],['Spicy Chicken Burger','generated illustration'],['Classic Margherita Pizza','generated illustration'],['Spicy Chicken Caesar Wrap','generated illustration']]){
  await search.fill(name);
  const card=page.locator('.meal-card').filter({has:page.getByRole('button',{name,exact:true})}).first();
  await expect(card.locator('svg[data-food-art]')).toHaveAttribute('data-food-art',kind);
  await expect(card.locator('[role="img"]')).toHaveAccessibleName(`${name} ${kind==='food photo'?'photograph':kind==='generated illustration'?'AI-generated illustration':'illustration'}`);
  const tag=card.locator('.meal-tag');
  if(await tag.count()){expect(await tag.innerText()).not.toBe('');expect(await tag.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(30);}
  await card.getByRole('button',{name:`View ${name}`,exact:true}).click();
  await expect(page.locator('.fond-item-art [data-food-art]')).toHaveAttribute('data-food-art',kind);
  await page.getByRole('button',{name:'Close item'}).click();
 }
 await search.fill('');
 await expect(page.locator('.fond-favourite-art svg').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
