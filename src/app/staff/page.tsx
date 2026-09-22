import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { StaffTablet } from '@/components/staff-tablet';
import { isTestHost } from '@/lib/environment';

export const metadata: Metadata = { title: 'FOND Staff | Order Queue', robots: { index: false, follow: false } };

export default async function StaffPage() {
  const test = isTestHost((await headers()).get('host'));
  return <StaffTablet testEnvironment={test} />;
}
