import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'FOND | Good food. Everyday.',description:'Breakfast, lunch and a little lift. Your FOND collection experience at Midpoint.',applicationName:'FOND',appleWebApp:{capable:true,statusBarStyle:'default',title:'FOND'},robots:{index:false,follow:false},icons:{icon:'/icon.svg',apple:'/icons/icon-192.png'}};
export const viewport: Viewport = {width:'device-width',initialScale:1,themeColor:'#213d32'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en-ZA"><body>{children}</body></html>}
