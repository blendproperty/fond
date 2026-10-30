import { OrderingApp } from '@/components/ordering-app';
import {FondLanding} from '@/components/fond-pages';
import {jsonLd,sitePageSchema,menuPriceRange} from '@/lib/site-schema';
import {settings} from '@/lib/management';
import {getAvailableMenu} from '@/lib/menu-store';
import {publicPageMetadata} from '@/lib/public-page-metadata';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;return params.payment||params.reference?{title:'FOND | Order update',robots:{index:false,follow:false}}:publicPageMetadata('/fond','FOND Café & Eatery | Midpoint Hub','Quality coffee, fresh food and all-day favourites at Midpoint. Explore the menu, opening hours and collection, delivery or dine-in options.');}
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {const params=await searchParams;return params.payment||params.reference?<OrderingApp premium/>:<><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(sitePageSchema('fond',{...settings(),priceRange:menuPriceRange(getAvailableMenu())}))}}/><FondLanding/></>;}
