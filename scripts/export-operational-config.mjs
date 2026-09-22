import { createDecipheriv } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const keyValue = process.env.FOND_CREDENTIALS_KEY;
if (!/^[a-f0-9]{64}$/i.test(keyValue ?? '')) throw new Error('Staging credential vault is unavailable.');
const key = Buffer.from(keyValue, 'hex');
const db = new DatabaseSync(process.env.FOND_DB_PATH ?? '/app/data/fond.sqlite');

function open(aad, row) {
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(row.iv));
  cipher.setAAD(Buffer.from(aad));
  cipher.setAuthTag(Buffer.from(row.tag));
  return Buffer.concat([cipher.update(Buffer.from(row.ciphertext)), cipher.final()]).toString('utf8');
}

const documentKeys = [
  'trading', 'content-draft', 'content-published', 'content-previous',
  'message-templates-draft', 'message-templates-published', 'message-templates-previous',
  'twilio-config', 'twilio-sms-config', 'meta-whatsapp-config', 'email-from',
];
const documents = Object.fromEntries(documentKeys.map(name => {
  const row = db.prepare('SELECT value FROM app_documents WHERE key=?').get(name);
  return [name, row?.value ?? null];
}));
const providers = Object.fromEntries(db.prepare('SELECT name,iv,tag,ciphertext FROM provider_secrets').all().map(row => [row.name, open(row.name, row)]));
const menu = db.prepare('SELECT id,name,description,category,price_cents,diet_json,symbol,sort_order,available,is_special,special_label,special_price_cents,modifiers_json,prep_minutes,updated_at FROM menu_items ORDER BY rowid').all();
const images = db.prepare('SELECT id,mime,bytes,created_at FROM promotion_images ORDER BY created_at,id').all().map(row => ({ ...row, bytes: Buffer.from(row.bytes).toString('base64') }));
const team = db.prepare('SELECT id,name,username,password_hash,role,active,created_at FROM team_members ORDER BY created_at,id').all();
const teamTwoFactor = db.prepare('SELECT member_id,iv,tag,ciphertext,active,recovery_json,updated_at FROM team_two_factor').all().map(row => ({
  memberId: row.member_id,
  secret: open(`team-2fa:${row.member_id}`, row),
  active: row.active,
  recoveryJson: row.recovery_json,
  updatedAt: row.updated_at,
}));

process.stdout.write(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), documents, providers, menu, images, team, teamTwoFactor }));
db.close();
