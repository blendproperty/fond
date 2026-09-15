import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getDb } from './db';

// Minimal first-party email/password auth. This is intentionally small:
// no OAuth/identity-provider federation yet (see PROJECT_CONTEXT.md open
// gates). Passwords are hashed with scrypt (Node built-in, no dependency).

export type SessionUser = { id: string; email: string; emailVerified: boolean };

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const SESSION_COOKIE = 'fond_session';

export class AuthError extends Error {}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) throw new AuthError('Enter a valid email address.');
  return trimmed;
}

export function signUp(email: string, password: string): { token: string; user: SessionUser } {
  const normalized = normalizeEmail(email);
  if (password.length < 8) throw new AuthError('Password must be at least 8 characters.');
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (existing) throw new AuthError('An account with that email already exists.');
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    normalized,
    hashPassword(password),
    new Date().toISOString(),
  );
  return { token: createSession(id), user: { id, email: normalized, emailVerified: false } };
}

export function logIn(email: string, password: string): { token: string; user: SessionUser } {
  const normalized = normalizeEmail(email);
  const db = getDb();
  const row = db.prepare('SELECT id, email, password_hash, email_verified_at FROM users WHERE email = ?').get(normalized) as
    | { id: string; email: string; password_hash: string; email_verified_at: string | null }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) throw new AuthError('Incorrect email or password.');
  return { token: createSession(row.id), user: { id: row.id, email: row.email, emailVerified: !!row.email_verified_at } };
}

function createSession(userId: string): string {
  const db = getDb();
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    now.toISOString(),
    new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  );
  return token;
}

export function resolveSession(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT users.id as id, users.email as email, users.email_verified_at as email_verified_at, sessions.expires_at as expires_at
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
    )
    .get(token) as { id: string; email: string; email_verified_at: string | null; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return { id: row.id, email: row.email, emailVerified: !!row.email_verified_at };
}

export function endSession(token: string | undefined | null): void {
  if (!token) return;
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
