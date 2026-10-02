import {notFound} from 'next/navigation';
import {ProfileInformation} from '@/components/profile-pages';
import {CustomerAccount} from '@/components/customer-account';
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(['orders','rewards','details'].includes(section))return <CustomerAccount view={section as 'orders'|'rewards'|'details'}/>;if(!['bookings','memberships','notifications','help'].includes(section))notFound();return <ProfileInformation section={section as 'bookings'|'memberships'|'notifications'|'help'}/>;}
