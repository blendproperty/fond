import {OrderingApp} from '@/components/ordering-app';
import {getAvailableMenu} from '@/lib/menu-store';
import {menuJsonLd} from '@/lib/menu-schema';
import {jsonLd,sitePageSchema,menuPriceRange} from '@/lib/site-schema';
import {settings} from '@/lib/management';
import {publicPageMetadata} from '@/lib/public-page-metadata';

export const dynamic='force-dynamic';
export function generateMetadata(){return publicPageMetadata('/fond/menu','FOND menu | Midpoint Hub','Explore current FOND food and drink prices, extras and Food Truck favourites. Order for collection, delivery or dine in at Midpoint Hub.');}
export default function Page(){const menu=getAvailableMenu();return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(sitePageSchema('menu',{...settings(),priceRange:menuPriceRange(menu)}))}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:menuJsonLd(menu)}}/><OrderingApp premium/></>;}
