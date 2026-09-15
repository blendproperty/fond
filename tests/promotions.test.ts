import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_CONTENT,validateContent} from '../src/lib/management';
const promotion={id:'offer-1',title:'Breakfast offer',body:'Start your day at FOND',active:true,startsAt:'2026-09-15T08:00:00+02:00',endsAt:'2026-09-15T07:00:00Z'};
test('promotion formats preserve legacy text and normalize timezone scheduling',()=>{
 const result=validateContent({...DEFAULT_CONTENT,promotions:[promotion]});assert.equal(result.promotions[0].startsAt,'2026-09-15T06:00:00.000Z');
 for(const display of ['banner','popup'] as const)assert.equal(validateContent({...DEFAULT_CONTENT,promotions:[{...promotion,display}]}).promotions[0].display,display);
});
test('promotion validation rejects broken images, categories and ambiguous schedules',()=>{
 for(const extra of [{display:'card'},{imageUrl:'https://example.com/image.jpg'},{category:'not-a-category'},{display:'unknown'},{endsAt:promotion.startsAt}])assert.throws(()=>validateContent({...DEFAULT_CONTENT,promotions:[{...promotion,...extra}]}));
 assert.throws(()=>validateContent({...DEFAULT_CONTENT,promotions:[promotion,promotion]}),/unique/);
 assert.doesNotThrow(()=>validateContent({...DEFAULT_CONTENT,promotions:[{...promotion,display:'card',imageUrl:'/api/promotion-images/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}]}));
});
