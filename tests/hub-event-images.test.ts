import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
process.env.FOND_DB_PATH=':memory:';
import {saveEventImage} from '../src/lib/hub-event-images';
import {hubDb,saveEvent,listEvents} from '../src/lib/hub-store';

test('event artwork is normalized, scoped, retained on edits and removable',async()=>{
  const image=await sharp({create:{width:2000,height:1000,channels:3,background:'#126b50'}}).jpeg().toBuffer();
  const url=await saveEventImage('gym',image,'test-owner');
  const stored=hubDb().prepare('SELECT bytes FROM hub_event_images WHERE id=?').get(url.split('/').pop()) as {bytes:Uint8Array};
  const meta=await sharp(Buffer.from(stored.bytes)).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,1600);assert.equal(meta.height,800);assert.equal(meta.exif,undefined);
  const event={calendar:'gym-events',title:'Fixture event',description:'Fixture',location:'Studio',startsAt:'2099-10-01T08:00:00Z',endsAt:'2099-10-01T09:00:00Z',published:true,imageUrl:url,imageAlt:'Green event poster'};
  const id=saveEvent('gym',event,'test-owner');assert.equal(listEvents('gym').find(e=>e.id===id)?.imageUrl,url);
  const {imageUrl,imageAlt,...withoutImage}=event;saveEvent('gym',{...withoutImage,id,title:'Updated'},'test-owner');assert.equal(listEvents('gym').find(e=>e.id===id)?.imageAlt,imageAlt);
  assert.throws(()=>saveEvent('padel',{...event,calendar:'padel-events'},'test-owner'),/this service/);
  assert.throws(()=>saveEvent('gym',{...event,imageUrl:'https://example.com/image.png'},'test-owner'),/this service/);
  saveEvent('gym',{...event,id,imageUrl:''},'test-owner');assert.equal(listEvents('gym').find(e=>e.id===id)?.imageUrl,'');
  await assert.rejects(()=>saveEventImage('gym',Buffer.from('<svg/>'),'test-owner'),/valid, still/);
  await assert.rejects(()=>saveEventImage('gym',Buffer.alloc(5_000_001),'test-owner'),/5 MB/);
  await assert.rejects(()=>saveEventImage('gym',Buffer.from([137,80,78,71,13,10,26,10]),'test-owner'),/valid, still/);
});
