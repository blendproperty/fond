import { teamSession } from './team';
import {providerSecret} from './provider-secrets';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Lightweight shared-tablet gate, not per-staff-member accounts. FOND's
// facility tablet is one shared device at the counter, not individually
// logged-in staff - a single access code (set via FOND_STAFF_CODE) is
// appropriate here, matching how the tablet is actually used. The cookie
// never stores the code itself, only an HMAC of it, so it can't be reversed
// if the cookie leaks; a request is authorised by recomputing that HMAC from
// the server's own FOND_STAFF_CODE and comparing in constant time.

export const STAFF_COOKIE = 'fond_staff';
const PEPPER = 'fond-staff-pepper-v1';

function requiredCode(): string {
  const code = providerSecret('staff-shared-code') ?? process.env.FOND_STAFF_CODE;
  if (!code) throw new Error('FOND_STAFF_CODE is not configured on the server.');
  return code;
}

function tokenFor(code: string): string {
  return createHmac('sha256', PEPPER).update(code).digest('hex');
}

export function checkStaffCode(candidate: string): string | null {
  const code = requiredCode();
  if (candidate !== code) return null;
  return tokenFor(code);
}

export function isValidStaffToken(token: string | undefined | null): boolean {
  if (!token) return false;
  if (token.startsWith('team_')) return !!teamSession(token);
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
