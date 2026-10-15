import {notFound,permanentRedirect} from 'next/navigation';
import {FunctionsInner} from '@/components/functions-pages';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(section==='michelle')permanentRedirect('/functions');if(!['enquire','spaces','packages','gallery'].includes(section))notFound();return <FunctionsInner section={section as 'enquire'|'spaces'|'packages'|'gallery'}/>;}
