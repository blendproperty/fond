import { createHmac, randomInt } from 'node:crypto';
import { getDb } from './db';
import { document } from './management';
import { providerSecret } from './provider-secrets';
import type { OrderRecord } from './orders';
import { buildControlledTestEmail, buildOrderEmail, buildVerificationEmail, type EmailMessage } from './email-template';

export const emailSender = () => document('email-from', '');
export const validEmailSender = (value: string) => /^[a-z0-9._+-]+@fond\.mid-point\.co\.za$/i.test(value.trim());
export function emailConfigured() {
  try { return !!providerSecret('email-api') && !!emailSender(); } catch { return false; }
}
function codeHash(userId: string, code: string) {
  const key = process.env.FOND_CREDENTIALS_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) throw new Error('Email verification key unavailable.');
  return createHmac('sha256', Buffer.from(key, 'hex')).update(`${userId}:${code}`).digest('hex');
}
async function send(to: string, message: EmailMessage, idempotencyKey: string) {
  const key = providerSecret('email-api'), from = emailSender();
  if (!key || !from) throw new Error('Email provider is not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(12000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ from: `FOND Midpoint <${from}>`, to: [to], ...message }),
  });
  if (!response.ok) throw new Error(`Email provider rejected this message (${response.status}).`);
  const result = await response.json() as { id?: string };
  return result.id ?? null;
}
export async function sendControlledEmailTest(to: string) {
  const recipient = to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('Enter a valid test email address.');
  const providerId = await send(recipient, buildControlledTestEmail(recipient), `fond-email-test-${Date.now()}`);
  return { recipient, providerId };
}
export async function requestVerification(user: { id: string; email: string }) {
  const db = getDb(), now = Date.now();
  const verified = db.prepare('SELECT email_verified_at FROM users WHERE id=?').get(user.id) as { email_verified_at: string | null } | undefined;
  if (!verified) throw new Error('Account not found.');
  if (verified.email_verified_at) return { verified: true };
  const prior = db.prepare('SELECT sent_at FROM email_verifications WHERE user_id=?').get(user.id) as { sent_at: string } | undefined;
  if (prior && now - new Date(prior.sent_at).getTime() < 60000) throw new Error('Wait one minute before requesting another code.');
  if (!emailConfigured()) throw new Error('Account email verification is not available yet.');
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const sentAt = new Date(now).toISOString();
  db.prepare('INSERT INTO email_verifications VALUES (?,?,?,0,?) ON CONFLICT(user_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,sent_at=excluded.sent_at').run(user.id, codeHash(user.id, code), new Date(now + 10 * 60000).toISOString(), sentAt);
  await send(user.email, buildVerificationEmail(code), `fond-verify-${user.id}-${now}`);
  return { sent: true };
}
export function verifyEmail(userId: string, code: string) {
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the six digit verification code.');
  const db = getDb();
  const row = db.prepare('SELECT * FROM email_verifications WHERE user_id=?').get(userId) as { code_hash: string; expires_at: string; attempts: number } | undefined;
  if (!row || new Date(row.expires_at).getTime() < Date.now() || row.attempts >= 5) throw new Error('This code expired. Request another one.');
  db.prepare('UPDATE email_verifications SET attempts=attempts+1 WHERE user_id=?').run(userId);
  if (row.code_hash !== codeHash(userId, code)) throw new Error('Incorrect verification code.');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(new Date().toISOString(), userId);
    db.prepare('DELETE FROM email_verifications WHERE user_id=?').run(userId);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export async function deliverOrderEmail(order: OrderRecord, event: 'received' | 'accepted' | 'ready' | 'completed') {
  if (!order.userId || !order.customerEmail || !emailConfigured()) return false;
  const verified = getDb().prepare('SELECT email_verified_at FROM users WHERE id=?').get(order.userId) as { email_verified_at: string | null } | undefined;
  if (!verified?.email_verified_at) return false;
  const id = `${order.id}:${event}`, db = getDb(), now = new Date().toISOString();
  db.prepare("INSERT OR IGNORE INTO email_jobs (id,order_id,event,recipient,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").run(id, order.id, event, order.customerEmail, 'pending', now, now);
  const job = db.prepare('SELECT status FROM email_jobs WHERE id=?').get(id) as { status: string };
  if (job.status === 'sent') return true;
  const claimed = db.prepare("UPDATE email_jobs SET status='sending',updated_at=? WHERE id=? AND (status IN ('pending','failed') OR (status='sending' AND updated_at<?))").run(now, id, new Date(Date.now() - 60000).toISOString());
  if (!claimed.changes) return false;
  try {
    const providerId = await send(order.customerEmail, buildOrderEmail(order, event), `fond-${id}`);
    db.prepare("UPDATE email_jobs SET status='sent',provider_id=?,error=NULL,updated_at=? WHERE id=?").run(providerId, new Date().toISOString(), id);
    return true;
  } catch (error) {
    db.prepare("UPDATE email_jobs SET status='failed',error=?,updated_at=? WHERE id=?").run(error instanceof Error ? error.message : 'Provider unavailable', new Date().toISOString(), id);
    return false;
  }
}
