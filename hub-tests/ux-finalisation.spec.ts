import {test,expect} from '@playwright/test';

test('public decision help remains usable on desktop and mobile',async({page})=>{
 await page.goto('/gym/classes');
 const help=page.getByRole('region',{name:'Class booking help'});
 await expect(help.getByRole('link',{name:'open Itensity in a new tab'})).toHaveAttribute('href',/itensityonline.com/);
 await expect(help.getByRole('link',{name:'contact Christine'})).toHaveAttribute('href',/^mailto:/);
 expect(await help.evaluate(element=>Boolean(element.compareDocumentPosition(document.querySelector('iframe')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await page.goto('/gym/membership');
 await expect(page.getByText(/Eligibility for these two plans has not yet been confirmed here/)).toBeVisible();
 await page.goto('/suites');
 await expect(page.locator('a[href="https://www.mid-point.co.za/the-suites-at-midpoint#request-to-book"]')).toBeVisible();
 await expect(page.getByText(/AI/).first()).toBeVisible();
 await page.goto('/functions/enquire?style=Buffet&context=fond-space');
 await expect(page.getByRole('button',{name:'Buffet',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('textarea')).toHaveValue('A gathering in the FOND dining space');
 for(const path of ['/fond','/gym/classes','/gym/membership','/padel','/functions/spaces','/functions/packages','/suites']){
  await page.goto(path);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
});

