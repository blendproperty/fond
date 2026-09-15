import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDb } from './db';
import { vaultKey } from './provider-secrets';
import { audit } from './management';

type Row = { iv: Uint8Array; tag: Uint8Array; ciphertext: Uint8Array; active: number; recovery_json: string };
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(bytes: Buffer) {
  let bits = 0, value = 0, result = '';
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { result += alphabet[(value >>> (bits -= 5)) & 31]; } }
  if (bits) result += alphabet[(value << (5 - bits)) & 31];
  return result;
}
function decode32(value: string) {
  let bits = 0, number = 0; const bytes: number[] = [];
  for (const char of value) { const index = alphabet.indexOf(char); if (index < 0) throw new Error('Invalid authenticator secret.'); number = (number << 5) | index; bits += 5; if (bits >= 8) { bytes.push((number >>> (bits -= 8)) & 255); } }
  return Buffer.from(bytes);
}
function otp(secret: string, step: number) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', decode32(secret)).update(counter).digest();
  const offset = digest[19] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0');
}
export function validOtp(secret: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  const step = Math.floor(now / 30000);
  return [-1, 0, 1].some(offset => timingSafeEqual(Buffer.from(otp(secret, step + offset)), Buffer.from(code)));
}
function seal(memberId: string, secret: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', vaultKey(), iv);
  cipher.setAAD(Buffer.from(`team-2fa:${memberId}`));
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ciphertext };
}
function open(memberId: string, row: Row) {
  const cipher = createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(row.iv));
  cipher.setAAD(Buffer.from(`team-2fa:${memberId}`)); cipher.setAuthTag(Buffer.from(row.tag));
  return Buffer.concat([cipher.update(Buffer.from(row.ciphertext)), cipher.final()]).toString('utf8');
}
export function twoFactorActive(memberId: string) {
  return !!getDb().prepare('SELECT 1 FROM team_two_factor WHERE member_id=? AND active=1').get(memberId);
}
export function superAdminTwoFactorActive() {
  return !!getDb().prepare("SELECT 1 FROM team_two_factor f JOIN team_members m ON m.id=f.member_id WHERE f.active=1 AND m.active=1 AND m.role='super-admin'").get();
}
export function beginTwoFactor(memberId: string, username: string) {
  if (twoFactorActive(memberId)) throw new Error('2FA is already active on this account.');
  const secret = base32(randomBytes(20)), sealed = seal(memberId, secret);
  getDb().prepare("INSERT INTO team_two_factor VALUES (?,?,?,?,0,'[]',?) ON CONFLICT(member_id) DO UPDATE SET iv=excluded.iv,tag=excluded.tag,ciphertext=excluded.ciphertext,active=0,recovery_json='[]',updated_at=excluded.updated_at").run(memberId, sealed.iv, sealed.tag, sealed.ciphertext, new Date().toISOString());
  audit(`team:${memberId}`, '2fa-enrollment-started', memberId);
  return { secret, uri: `otpauth://totp/${encodeURIComponent(`FOND:${username}`)}?secret=${secret}&issuer=FOND&digits=6&period=30` };
}
export function activateTwoFactor(memberId: string, code: string) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM team_two_factor WHERE member_id=?').get(memberId) as Row | undefined;
  if (!row || row.active || !validOtp(open(memberId, row), code)) throw new Error('Incorrect authenticator code.');
  const codes = Array.from({ length: 8 }, () => `FOND-${randomBytes(10).toString('hex').toUpperCase()}`);
  const hashes = codes.map(value => createHash('sha256').update(`${memberId}:${value}`).digest('hex'));
  db.prepare('UPDATE team_two_factor SET active=1,recovery_json=?,updated_at=? WHERE member_id=?').run(JSON.stringify(hashes), new Date().toISOString(), memberId);
  audit(`team:${memberId}`, '2fa-enabled', memberId);
  return codes;
}
export function verifyMemberTwoFactor(memberId: string, code: string | undefined) {
  const db = getDb(), row = db.prepare('SELECT * FROM team_two_factor WHERE member_id=?').get(memberId) as Row | undefined;
  if (!row?.active) return true;
  if (!code) return false;
  if (validOtp(open(memberId, row), code)) return true;
  const hash = createHash('sha256').update(`${memberId}:${code.trim().toUpperCase()}`).digest('hex');
  const recoveries = JSON.parse(row.recovery_json) as string[];
  const index = recoveries.indexOf(hash);
  if (index < 0) return false;
  db.exec('BEGIN IMMEDIATE');
  try {
    const fresh = db.prepare('SELECT recovery_json FROM team_two_factor WHERE member_id=?').get(memberId) as { recovery_json: string };
    const remaining = JSON.parse(fresh.recovery_json) as string[];
    const freshIndex = remaining.indexOf(hash);
    if (freshIndex < 0) { db.exec('ROLLBACK'); return false; }
    remaining.splice(freshIndex, 1);
    db.prepare('UPDATE team_two_factor SET recovery_json=? WHERE member_id=?').run(JSON.stringify(remaining), memberId);
    db.exec('COMMIT'); audit(`team:${memberId}`, '2fa-recovery-used', memberId); return true;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
