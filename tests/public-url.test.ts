import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicBaseUrl} from '../src/lib/public-url';

test('public URL uses a valid secure explicit URL, then falls back to the routed host',()=>{
 const oldUrl=process.env.FOND_PUBLIC_URL,oldHost=process.env.FOND_HOST;
 try{
  process.env.FOND_PUBLIC_URL='https://fond.example/path';process.env.FOND_HOST='fallback.example';assert.equal(publicBaseUrl(),'https://fond.example');
  process.env.FOND_PUBLIC_URL='[https://broken.example](https://broken.example)';process.env.FOND_HOST='fond.mid-point.co.za';assert.equal(publicBaseUrl(),'https://fond.mid-point.co.za');
  delete process.env.FOND_PUBLIC_URL;process.env.FOND_HOST='fond.mid-point.co.za.evil/example';assert.equal(publicBaseUrl(),null);
 }finally{
  if(oldUrl===undefined)delete process.env.FOND_PUBLIC_URL;else process.env.FOND_PUBLIC_URL=oldUrl;
  if(oldHost===undefined)delete process.env.FOND_HOST;else process.env.FOND_HOST=oldHost;
 }
});
