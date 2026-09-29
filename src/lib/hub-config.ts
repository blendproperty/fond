export const HUB_CONTACTS = {
  gym: { name: 'Christine', email: 'christine@midpointhub.com' },
  padel: { name: 'Ali', email: 'ali@midpointhub.com' },
  fond: { name: 'Ray', email: 'ray@midpointhub.com' },
  functions: { name: 'Michelle', email: 'michelle@midpointhub.com' },
} as const;
export type HubService = 'gym' | 'padel';
export type HubCalendar = 'gym-classes' | 'gym-events' | 'padel-events';
export function hubEnabled() { return process.env.MIDPOINT_HUB_ENABLED === 'true'; }
export function playtomicVenueUrl() {
  try {
    const url = new URL(process.env.MIDPOINT_PLAYTOMIC_URL ?? '');
    if (url.protocol === 'https:' && ['playtomic.com', 'playtomic.io'].includes(url.hostname) && url.pathname !== '/') return url.href;
  } catch { /* The venue must be configured; a generic homepage is not a booking link. */ }
  return null;
}
