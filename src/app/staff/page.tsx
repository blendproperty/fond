import type { Metadata } from 'next';
import { StaffTablet } from '@/components/staff-tablet';

export const metadata: Metadata = { title: 'FOND Staff | Order Queue', robots: { index: false, follow: false } };

export default function StaffPage() {
  return <StaffTablet />;
}
