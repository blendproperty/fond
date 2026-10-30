import {test,expect} from '@playwright/test';
test('Hub-mode root and alias share the canonical identity and private/staging indexing guards remain intact',async({request})=>{
 for(const path of ['/','/hub']){
  const response=await request.get(path),html=await response.text();expect(response.ok()).toBe(true);const block=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));expect(block).toHaveLength(1);const nodes=block[0]['@graph'];expect(nodes.find((n:{'@type':string})=>n['@type']==='LocalBusiness').name).toBe('Midpoint Hub');expect(nodes.find((n:{'@type':string})=>n['@type']==='WebPage').url).toBe('https://midpointhub.com/');expect(html).toContain('rel="canonical" href="https://midpointhub.com/"');
 }
 for(const path of ['/','/hub','/fond','/fond/menu']){
  const production=await request.get(path,{headers:{host:'midpointhub.com'}});expect([...(await production.text()).matchAll(/<meta name="robots" content="([^"]*)"/g)].map(m=>m[1])).toEqual(['index, follow']);
  const staging=await request.get(path,{headers:{host:'fond-test.mid-point.co.za'}});expect(await staging.text()).toContain('noindex, nofollow');
 }
 for(const path of ['/admin','/staff','/account','/profile','/fond?reference=TEST-PRIVATE','/fond?payment=TEST-PRIVATE']){const response=await request.get(path,{headers:{host:'midpointhub.com'}});expect(await response.text(),path).toContain('noindex, nofollow');}
 const admin=await request.get('/admin');expect(await admin.text()).toContain('noindex, nofollow');const staging=await request.get('/fond/menu',{headers:{host:'fond-test.mid-point.co.za'}}),stagingHtml=await staging.text();expect(stagingHtml).toContain('noindex, nofollow');expect(stagingHtml).toContain('TEST | FOND menu');
});
