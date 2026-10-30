import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {isTestHost} from './environment';
import {SITE_URL} from './site-schema';

export async function publicPageMetadata(path:string,title:string,description:string):Promise<Metadata>{
 const host=(await headers()).get('host');
 return {title:isTestHost(host)?`TEST | ${title}`:title,description,alternates:{canonical:SITE_URL+path}};
}
