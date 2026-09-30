import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {hubDb,HubError} from './hub-store';
import type {HubService} from './hub-config';
import {audit} from './management';

export async function saveEventImage(service:HubService,input:Buffer,actor:string){
  if(!input.length||input.length>5_000_000)throw new HubError('Choose an image under 5 MB.');
  let bytes:Buffer;
  try{
    const source=sharp(input,{limitInputPixels:25_000_000,failOn:'warning'});
    const meta=await source.metadata();
    if(!['jpeg','png','webp'].includes(meta.format??'')||(meta.pages??1)>1)throw new Error();
    // Decode and re-encode to remove metadata and keep phone downloads small.
    bytes=await source.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
  }catch{throw new HubError('Use a valid, still JPG, PNG or WebP image (up to 25 megapixels).');}
  const db=hubDb();
  if(Number(db.prepare('SELECT count(*) AS n FROM hub_event_images WHERE service=?').get(service)?.n)>=500)throw new HubError('The image library is full. Contact your administrator.');
  const id=randomUUID();
  db.prepare('INSERT INTO hub_event_images VALUES(?,?,?,?)').run(id,service,bytes,new Date().toISOString());
  audit(actor,'hub-event-image-uploaded',`${service}:${id}`);
  return '/api/hub/event-images/'+id;
}
