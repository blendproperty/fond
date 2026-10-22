import {test,expect} from '@playwright/test';

test('menu illustrations remain visible behind compact dietary labels and match dish types',async({page})=>{
 await page.goto('/fond/menu');
 const search=page.getByRole('searchbox',{name:'Search the menu'});
 for(const [name,kind] of [['Smashed Avo','toast'],['Brekkie Bun','burger'],['3 Egg Omelette','omelette'],['Pasta Napoletana','pasta'],['Spicy Chicken Burger','burger'],['Classic Margherita Pizza','pizza'],['Spicy Chicken Caesar Wrap','wrap']]){
  await search.fill(name);
  const card=page.locator('.meal-card').filter({has:page.getByRole('button',{name,exact:true})}).first();
  await expect(card.locator('svg[data-food-art]')).toHaveAttribute('data-food-art',kind);
  await expect(card.locator('[role="img"]')).toHaveAccessibleName(`${name} illustration`);
  const tag=card.locator('.meal-tag');
  if(await tag.count())expect(await tag.evaluate(el=>el.getBoundingClientRect().height)).toBeLessThan(30);
  await card.getByRole('button',{name:`View ${name}`,exact:true}).click();
  await expect(page.locator('.fond-item-art [data-food-art]')).toHaveAttribute('data-food-art',kind);
  await page.getByRole('button',{name:'Close item'}).click();
 }
 await search.fill('');
 await expect(page.locator('.fond-favourite-art svg').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
