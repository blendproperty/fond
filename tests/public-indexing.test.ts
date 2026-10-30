import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canIndexPublicPage} from '../src/lib/environment';
test('only approved public paths on the canonical production host allow indexing',()=>{
 for(const host of ['midpointhub.com','MIDPOINTHUB.COM','midpointhub.com:443'])for(const path of ['/','/hub','/fond','/fond/menu'])assert.equal(canIndexPublicPage(host,path),true);
 for(const host of [undefined,null,'','localhost:3100','127.0.0.1:3196','fond-test.mid-point.co.za','fond.mid-point.co.za','midpointhub.com.example.test','www.midpointhub.com'])assert.equal(canIndexPublicPage(host,'/fond/menu'),false);
});
test('private, operational and unapproved pages never gain indexing from a production host',()=>{
 for(const path of ['/admin','/staff','/account','/profile','/rewards','/fond/track','/fond/reorder','/api/menu','/gym','/fond?reference=private'])assert.equal(canIndexPublicPage('midpointhub.com',path),false);
});
