import { OrderingApp } from '@/components/ordering-app';
import {FondLanding} from '@/components/fond-pages';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {const params=await searchParams;return params.payment||params.reference?<OrderingApp premium/>:<FondLanding/>;}
