import {notFound} from 'next/navigation';
import {FunctionsInner} from '@/components/functions-pages';
import {FUNCTION_CUISINES,FUNCTION_ENQUIRY_CONTEXTS} from '@/lib/function-config';
export default async function Page({params,searchParams}:{params:Promise<{section:string}>;searchParams:Promise<{style?:string;context?:string}>}){
 const {section}=await params;if(!['enquire','spaces','packages','michelle','gallery'].includes(section))notFound();
 const query=await searchParams,style=FUNCTION_CUISINES.find(value=>value===query.style)??'';
 const theme=typeof query.context==='string'&&Object.hasOwn(FUNCTION_ENQUIRY_CONTEXTS,query.context)?FUNCTION_ENQUIRY_CONTEXTS[query.context as keyof typeof FUNCTION_ENQUIRY_CONTEXTS]:'';
 return <FunctionsInner section={section as 'enquire'|'spaces'|'packages'|'michelle'|'gallery'} initialStyle={style} initialTheme={theme}/>;
}
