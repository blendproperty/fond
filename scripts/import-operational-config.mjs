import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

if (process.env.FOND_IMPORT_TARGET !== 'production') throw new Error('Production import guard is missing.');
const publicHost = (process.env.FOND_IMPORT_HOST ?? '').toLowerCase();
if (publicHost !== 'fond.mid-point.co.za') throw new Error(`Refusing configuration import for ${publicHost}.`);
const keyValue = process.env.FOND_CREDENTIALS_KEY;
if (!/^[a-f0-9]{64}$/i.test(keyValue ?? '')) throw new Error('Production credential vault is unavailable.');
const key = Buffer.from(keyValue, 'hex');
let rawInput = '';
for await (const chunk of process.stdin) rawInput += chunk;
const input = JSON.parse(rawInput);
if (input?.version !== 1 || !input.documents || !input.providers || !Array.isArray(input.menu) || !Array.isArray(input.images) || !Array.isArray(input.team) || !Array.isArray(input.teamTwoFactor)) throw new Error('Invalid operational configuration package.');

const db = new DatabaseSync(process.env.FOND_DB_PATH ?? '/app/data/fond.sqlite');
db.exec('PRAGMA foreign_keys=ON');
const now = new Date().toISOString();

function seal(aad, value) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { iv, tag: cipher.getAuthTag(), ciphertext };
}
function existingSecret(name) {
  const row = db.prepare('SELECT iv,tag,ciphertext FROM provider_secrets WHERE name=?').get(name);
  if (!row) return null;
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(row.iv));
  cipher.setAAD(Buffer.from(name)); cipher.setAuthTag(Buffer.from(row.tag));
  return Buffer.concat([cipher.update(Buffer.from(row.ciphertext)), cipher.final()]).toString('utf8');
}
function parsedDocument(name, fallback = {}) {
  const raw = input.documents[name];
  return typeof raw === 'string' ? JSON.parse(raw) : fallback;
}
function upsertDocument(name, raw) {
  if (typeof raw !== 'string') return;
  JSON.parse(raw);
  db.prepare('INSERT INTO app_documents(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').run(name, raw, now);
}
function providerConfigured(name) {
  return !!db.prepare('SELECT 1 FROM provider_secrets WHERE name=?').get(name);
}

const copiedProviders = [];
const safeProviderNames = ['email-api', 'twilio-auth-token', 'meta-access-token', 'meta-app-secret', 'meta-webhook-verify'];
db.exec('BEGIN IMMEDIATE');
try {
  for (const name of safeProviderNames) {
    const value = input.providers[name];
    if (typeof value !== 'string' || !value) continue;
    const sealed = seal(name, value);
    db.prepare('INSERT INTO provider_secrets(name,iv,tag,ciphertext,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET iv=excluded.iv,tag=excluded.tag,ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').run(name, sealed.iv, sealed.tag, sealed.ciphertext, now);
    copiedProviders.push(name);
  }

  db.prepare('DELETE FROM menu_items').run();
  const insertMenu = db.prepare('INSERT INTO menu_items(id,name,description,category,price_cents,diet_json,symbol,sort_order,available,is_special,special_label,special_price_cents,modifiers_json,prep_minutes,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for (const item of input.menu) insertMenu.run(item.id,item.name,item.description,item.category,item.price_cents,item.diet_json,item.symbol,item.sort_order,item.available,item.is_special,item.special_label,item.special_price_cents,item.modifiers_json,item.prep_minutes,item.updated_at);

  db.prepare('DELETE FROM promotion_images').run();
  const insertImage = db.prepare('INSERT INTO promotion_images(id,mime,bytes,created_at) VALUES(?,?,?,?)');
  for (const image of input.images) insertImage.run(image.id,image.mime,Buffer.from(image.bytes,'base64'),image.created_at);

  for (const name of ['content-draft','content-published','content-previous','message-templates-draft','message-templates-published','message-templates-previous','twilio-sms-config','meta-whatsapp-config','email-from']) upsertDocument(name, input.documents[name]);
  const incomingTwilio = parsedDocument('twilio-config');
  if (incomingTwilio.mode === 'production') upsertDocument('twilio-config', input.documents['twilio-config']);

  const liveYoco = existingSecret('yoco-secret')?.startsWith('sk_live_') && existingSecret('yoco-webhook')?.startsWith('whsec_');
  const sms = parsedDocument('twilio-sms-config');
  const smsReady = providerConfigured('twilio-auth-token') && /^AC[a-f0-9]{32}$/i.test(sms.accountSid ?? '') && /^\+[1-9]\d{7,14}$/.test(sms.sender ?? '');
  const meta = parsedDocument('meta-whatsapp-config');
  const metaReady = providerConfigured('meta-access-token') && /^\d{6,30}$/.test(meta.phoneNumberId ?? '') && /^\d{6,30}$/.test(meta.wabaId ?? '');
  const currentTwilio = db.prepare('SELECT value FROM app_documents WHERE key=?').get('twilio-config');
  const twilio = currentTwilio ? JSON.parse(currentTwilio.value) : {};
  const twilioReady = providerConfigured('twilio-auth-token') && twilio.mode === 'production' && /^\+[1-9]\d{7,14}$/.test(twilio.sender ?? '') && /^HX[a-f0-9]{32}$/i.test(twilio.acceptedContentSid ?? '') && /^HX[a-f0-9]{32}$/i.test(twilio.readyContentSid ?? '');
  const trading = parsedDocument('trading');
  trading.allowTestPayments = false;
  trading.onlinePaymentsEnabled = Boolean(trading.onlinePaymentsEnabled && liveYoco);
  trading.smsEnabled = Boolean(trading.smsEnabled && smsReady);
  trading.whatsappEnabled = Boolean(trading.whatsappEnabled && (metaReady || twilioReady));
  upsertDocument('trading', JSON.stringify(trading));

  const insertedTeamIds = new Set();
  for (const member of input.team) {
    const existing = db.prepare('SELECT id FROM team_members WHERE id=? OR username=?').get(member.id, member.username);
    if (existing) continue;
    db.prepare('INSERT INTO team_members(id,name,username,password_hash,role,active,created_at) VALUES(?,?,?,?,?,?,?)').run(member.id,member.name,member.username,member.password_hash,member.role,member.active,member.created_at);
    insertedTeamIds.add(member.id);
  }
  for (const factor of input.teamTwoFactor) {
    if (!insertedTeamIds.has(factor.memberId)) continue;
    const sealed = seal(`team-2fa:${factor.memberId}`, factor.secret);
    db.prepare('INSERT INTO team_two_factor(member_id,iv,tag,ciphertext,active,recovery_json,updated_at) VALUES(?,?,?,?,?,?,?)').run(factor.memberId,sealed.iv,sealed.tag,sealed.ciphertext,factor.active,factor.recoveryJson,factor.updatedAt);
  }
  db.prepare('INSERT INTO admin_events(id,actor,action,target,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),'system:configuration-consolidation','configuration-consolidated','staging-to-production',now);
  db.exec('COMMIT');

  process.stdout.write(JSON.stringify({
    ok: true,
    menuItems: input.menu.length,
    promotionImages: input.images.length,
    operationalDocuments: Object.values(input.documents).filter(value => typeof value === 'string').length,
    copiedProviders,
    teamMembersAdded: insertedTeamIds.size,
    productionSafety: { onlinePaymentsEnabled: trading.onlinePaymentsEnabled, smsEnabled: trading.smsEnabled, whatsappEnabled: trading.whatsappEnabled, sandboxPaymentsDisabled: !trading.allowTestPayments },
  }));
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
