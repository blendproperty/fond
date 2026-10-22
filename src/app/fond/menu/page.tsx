import {OrderingApp} from '@/components/ordering-app';
import {getAvailableMenu} from '@/lib/menu-store';
import {menuJsonLd} from '@/lib/menu-schema';

export const dynamic='force-dynamic';
export default function Page(){return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:menuJsonLd(getAvailableMenu())}}/><OrderingApp premium/></>;}
