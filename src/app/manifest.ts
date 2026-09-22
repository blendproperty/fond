import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { isTestHost, publicAppName } from '@/lib/environment';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const host = (await headers()).get('host');
  const test = isTestHost(host);
  return {id:'/',name:publicAppName(host),short_name:test?'FOND TEST':'FOND',description:'Good food. Everyday.',start_url:'/',scope:'/',display:'standalone',background_color:test?'#fff4cf':'#f7f5ee',theme_color:test?'#b26b00':'#213d32',icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
