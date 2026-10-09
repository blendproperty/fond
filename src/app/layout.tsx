import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { isTestHost } from '@/lib/environment';
import { WhatsAppChat } from '@/components/whatsapp-chat';

export async function generateMetadata(): Promise<Metadata> {
  const test = isTestHost((await headers()).get('host'));
  return {title:test?'FOND TEST | Good food. Everyday.':'FOND | Good food. Everyday.',description:'Breakfast, lunch and a little lift. Your FOND collection experience at Midpoint.',applicationName:test?'FOND TEST':'FOND',appleWebApp:{capable:true,statusBarStyle:'default',title:test?'FOND TEST':'FOND'},robots:{index:false,follow:false},icons:{icon:'/icon.svg',apple:'/icons/icon-192.png'}};
}
export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:'#17221e'};
export default async function RootLayout({children}:{children:React.ReactNode}) {const practice=process.env.FOND_PRACTICE==='true'&&(await headers()).get('host')==='127.0.0.1:3101';return <html lang="en-ZA"><body>{practice&&<aside className="practice-banner">PRACTICE ONLY · Simulated receipts and payments · <a href="/practice">Step-by-step guide</a></aside>}{children}{!practice&&<WhatsAppChat/>}</body></html>}
