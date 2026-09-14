import { createHmac, timingSafeEqual } from 'node:crypto';

// Separate, stricter gate from the facility staff tablet (src/lib/staff-auth.ts).
// The staff tablet is one shared front-counter device that only accepts and
// advances orders; /admin can change prices, add/remove menu items and run
// specials, so it gets its own code (FOND_ADMIN_CODE) known only to whoever
// runs the business, not shared with everyone on the tablet. Same HMAC-cookie
// pattern as staff-auth so the raw code never sits in a cookie.

export const ADMIN_COOKIE = 'fond_admin';
const PEPPER = 'fond-admin-pepper-v1';

function requiredCode(): string {
  const code = process.env.FOND_ADMIN_CODE;
  if (!code) throw new Error('FOND_ADMIN_CODE is not configured on the server.');
  return code;
}

function tokenFor(code: string): string {
  return createHmac('sha256', PEPPER).update(code).digest('hex');
}

export function checkAdminCode(candidate: string): string | null {
  const code = requiredCode();
  if (candidate !== code) return null;
  return tokenFor(code);
}

export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  let expected: string;
  try {
    expected = tokenFor(requiredCode());
  } catch {
    return false;
  }
  const a = Buffer.from(token, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
