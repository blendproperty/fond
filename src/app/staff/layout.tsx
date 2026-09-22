import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { isTestHost } from '@/lib/environment';

export async function generateMetadata(): Promise<Metadata> {
  const test = isTestHost((await headers()).get('host'));
  const name = test ? 'FOND Staff TEST' : 'FOND Staff';
  return {
    manifest: '/staff/manifest.webmanifest',
    applicationName: name,
    appleWebApp: { capable: true, statusBarStyle: 'default', title: name },
  };
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return children;
}
