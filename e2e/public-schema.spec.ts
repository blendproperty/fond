import {test,expect} from '@playwright/test';
test('public Hub and FOND pages render accurate connected schema and canonical metadata with scoped production indexing',async({request,page})=>{
 for(const [path,mainType] of [['/hub','LocalBusiness'],['/fond','Restaurant'],['/fond/menu','Menu']]){
  const response=await request.get(path),html=await response.text();expect(response.ok()).toBe(true);
  const blocks=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));const nodes=blocks.flatMap(b=>b['@graph']??[b]);
  expect(nodes.some(n=>n['@type']===mainType)).toBe(true);expect(nodes.filter(n=>n['@type']==='WebSite')).toHaveLength(1);expect(nodes.filter(n=>n['@type']==='WebPage')).toHaveLength(1);expect(html).toContain(`rel="canonical" href="https://midpointhub.com${path==='/hub'?'/':path}"`);expect(html).toContain('noindex, nofollow');
  const production=await request.get(path,{headers:{host:'midpointhub.com'}}),productionHtml=await production.text();expect([...productionHtml.matchAll(/<meta name="robots" content="([^"]*)"/g)].map(m=>m[1])).toEqual(['index, follow']);
  expect(html).toContain('162 Tonetti Street');if(path!=='/hub'){expect(nodes.some(n=>n['@type']==='BreadcrumbList')).toBe(true);expect(nodes.find(n=>n['@type']==='Restaurant').hasMenu).toBe('https://midpointhub.com/fond/menu');}
 }
 await page.goto('/fond/menu');await expect(page.locator('.fond-public-footer')).toContainText('162 Tonetti Street');await expect(page.locator('.fond-public-footer')).toContainText('Mon');await expect(page).toHaveTitle('FOND menu | Midpoint Hub');
 const privateResponse=await request.get('/fond?reference=TEST-PRIVATE',{headers:{host:'midpointhub.com'}});expect(await privateResponse.text()).toContain('noindex, nofollow');
});
