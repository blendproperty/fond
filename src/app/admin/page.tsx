import type { Metadata } from 'next';
import {TeamPortal} from '@/components/team-portal';
import {hubEnabled} from '@/lib/hub-config';
import { AdminPanel } from '@/components/admin-panel';

export const metadata: Metadata = { title: 'Midpoint Hub Team', robots: { index: false, follow: false } };

export default function AdminPage() {
  return hubEnabled()?<TeamPortal/>:<AdminPanel />;
}
