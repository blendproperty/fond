import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { getDb } from './db';
import { vaultKey } from './provider-secrets';
import { audit } from './management';
import { HUB_CONTACTS, type HubService, type HubCalendar } from './hub-config';
import { sendEmailMessage } from './email';
import { publicBaseUrl } from './public-url';

export type HubEvent = { id: string; service: HubService; calendar: HubCalendar; title: string; description: string; startsAt: string; endsAt: string; location: string; published: boolean };
export class HubError extends Error {}
export function hubDb() {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS hub_requests (
    id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL, service TEXT NOT NULL,
    kind TEXT NOT NULL, event_id TEXT, details TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
    notification TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS hub_events (id TEXT PRIMARY KEY, service TEXT NOT NULL, calendar TEXT NOT NULL,
    title TEXT NOT NULL, description TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
    location TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS hub_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS hub_settings (service TEXT PRIMARY KEY, booking_url TEXT NOT NULL DEFAULT '');`);
  return db;
}
export function serviceOf(value: unknown): HubService {
  if (value !== 'gym' && value !== 'padel') throw new HubError('Choose Gym or Padel.');
  return value;
}
function text(value: unknown, label: string, max: number, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new HubError(`Enter a valid ${label}.`);
  return value.trim();
}
export function seal(value: object, id: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', vaultKey(), iv);
  cipher.setAAD(Buffer.from(`hub-request:${id}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(b => b.toString('base64')).join('.');
}
export function openRequest(value: string, id: string): Record<string, string | boolean> {
  const [iv, tag, encrypted] = value.split('.').map(s => Buffer.from(s, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', vaultKey(), iv); cipher.setAAD(Buffer.from(`hub-request:${id}`)); cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8'));
}
export function listEvents(service: HubService, publicOnly = true): HubEvent[] {
  return (hubDb().prepare(`SELECT id,service,calendar,title,description,starts_at AS startsAt,ends_at AS endsAt,location,published FROM hub_events WHERE service=? ${publicOnly ? 'AND published=1' : ''} ORDER BY starts_at`).all(service) as unknown as HubEvent[]).map(e => ({...e, published: !!e.published}));
}
export function saveEvent(service: HubService, input: Record<string, unknown>, actor: string) {
  const calendar = text(input.calendar, 'calendar', 30) as HubCalendar;
  if (!(service === 'gym' ? ['gym-classes', 'gym-events'] : ['padel-events']).includes(calendar)) throw new HubError('Choose a calendar for your service.');
  const title = text(input.title, 'title', 120), description = text(input.description, 'description', 2000), location = text(input.location, 'location', 160);
  const starts = text(input.startsAt, 'start date', 40), ends = text(input.endsAt, 'end date', 40);
  if (!/Z$|[+-]\d\d:\d\d$/.test(starts) || !/Z$|[+-]\d\d:\d\d$/.test(ends) || !Number.isFinite(Date.parse(starts)) || !Number.isFinite(Date.parse(ends)) || Date.parse(ends) <= Date.parse(starts)) throw new HubError('Choose valid start and end times.');
  const id = input.id ? text(input.id, 'event', 80) : randomUUID(), db = hubDb();
  if (input.id && !db.prepare('SELECT id FROM hub_events WHERE id=? AND service=?').get(id, service)) throw new HubError('Event not found.');
  db.prepare(`INSERT INTO hub_events VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET calendar=excluded.calendar,title=excluded.title,description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,location=excluded.location,published=excluded.published,updated_at=excluded.updated_at`).run(id, service, calendar, title, description, new Date(starts).toISOString(), new Date(ends).toISOString(), location, input.published === true ? 1 : 0, new Date().toISOString());
  audit(actor, input.published === true ? 'hub-event-published' : 'hub-event-saved', id); return id;
}
export function bookingUrl(service: HubService): string | null {
  const row = hubDb().prepare('SELECT booking_url FROM hub_settings WHERE service=?').get(service) as {booking_url: string}|undefined;
  return row?.booking_url || null;
}
export function saveBookingUrl(service: HubService, value: unknown, actor: string) {
  if (service !== 'padel') throw new HubError('Court booking settings are for Padel.');
  const raw = text(value, 'Playtomic venue link', 500, false);
  if (raw) { let url: URL; try { url = new URL(raw); } catch { throw new HubError('Enter the full secure Playtomic venue link.'); }
    if (url.protocol !== 'https:' || !['playtomic.com', 'playtomic.io'].includes(url.hostname) || url.pathname === '/' || url.username || url.password) throw new HubError('Use a direct Playtomic venue link.'); }
  hubDb().prepare('INSERT INTO hub_settings VALUES (?,?) ON CONFLICT(service) DO UPDATE SET booking_url=excluded.booking_url').run(service, raw); audit(actor, 'hub-booking-link-updated', service);
}
export function submitHubRequest(input: Record<string, unknown>, key: string) {
  const service = serviceOf(input.service), kind = input.kind === 'interest' ? 'interest' : 'signup';
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(key)) throw new HubError('Refresh the page and try again.');
  if (input.website) throw new HubError('Unable to submit this request.');
  const firstName = text(input.firstName, 'first name', 80), surname = text(input.surname, 'surname', 80);
  const email = text(input.email, 'email address', 254).toLowerCase(), phone = text(input.phone, 'mobile number', 30);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[\d ()-]{7,30}$/.test(phone)) throw new HubError('Enter a valid email address and mobile number.');
  if (input.consent !== true) throw new HubError('Please agree to the use of your details for this request.');
  const details = {firstName, surname, email, phone, company: text(input.company ?? '', 'company', 160, service === 'padel'), building: text(input.building ?? '', 'building or unit', 100, service === 'padel'), identity: kind === 'signup' ? text(input.identity, 'ID or passport number', 40) : '', playtomicAccount: input.playtomicAccount === true, consent: true};
  const db = hubDb(), eventId = kind === 'interest' ? text(input.eventId, 'event', 80) : null;
  if (eventId && !db.prepare('SELECT id FROM hub_events WHERE id=? AND service=? AND published=1 AND ends_at>?').get(eventId, service, new Date().toISOString())) throw new HubError('This event is no longer available. Please refresh the calendar.');
  // Hash the encrypted-request fingerprint with the private vault key to avoid exposing ID guesses.
  const fingerprint = createHash('sha256').update(vaultKey()).update(JSON.stringify({service,kind,eventId,details})).digest('hex');
  const prior = db.prepare('SELECT id,fingerprint FROM hub_requests WHERE request_key=?').get(key) as {id: string; fingerprint: string}|undefined;
  if (prior) { if (prior.fingerprint !== fingerprint) throw new HubError('This request has changed. Refresh and try again.'); return prior.id; }
  const now = Date.now(), limitKey = createHash('sha256').update(email).digest('hex');
  db.prepare('DELETE FROM hub_limits WHERE expires_at<=?').run(now);
  for (const [bucket,max] of [[limitKey,5],['all',100]] as const) {
    const count = db.prepare('INSERT INTO hub_limits VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').get(bucket,now+3600000) as {count:number};
    if (count.count > max) throw new HubError('Too many requests. Please try again later or contact the team.');
  }
  const id = randomUUID(), timestamp = new Date(now).toISOString();
  db.prepare('INSERT INTO hub_requests (id,request_key,fingerprint,service,kind,event_id,details,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id,key,fingerprint,service,kind,eventId,seal(details,id),timestamp,timestamp);
  return id;
}
export function listRequests(service: HubService, actor: string) {
  const rows = hubDb().prepare('SELECT id,kind,event_id AS eventId,status,notification,created_at AS createdAt,details FROM hub_requests WHERE service=? ORDER BY created_at DESC LIMIT 200').all(service) as {id:string;kind:string;eventId:string|null;status:string;notification:string;createdAt:string;details:string}[];
  audit(actor, 'hub-requests-viewed', service);
  return rows.map(({details,...r}) => ({...r, details: openRequest(details,r.id)}));
}
export function updateRequest(service: HubService, id: string, status: unknown, actor: string) {
  if (!['new','contacted','completed','closed'].includes(String(status))) throw new HubError('Choose a valid request status.');
  const result = hubDb().prepare('UPDATE hub_requests SET status=?,updated_at=? WHERE id=? AND service=?').run(String(status),new Date().toISOString(),id,service);
  if (!result.changes) throw new HubError('Request not found.'); audit(actor, 'hub-request-status', `${id}:${status}`);
}
export async function notifyHubRequest(id: string) {
  const db = hubDb();
  const row = db.prepare('SELECT service,notification,updated_at FROM hub_requests WHERE id=?').get(id) as {service:HubService;notification:string;updated_at:string}|undefined;
  if (!row || row.notification === 'sent' || process.env.MIDPOINT_HUB_EMAIL_ENABLED !== 'true') return;
  const claim = db.prepare("UPDATE hub_requests SET notification='sending',updated_at=? WHERE id=? AND (notification IN ('pending','failed') OR (notification='sending' AND updated_at<?))").run(new Date().toISOString(),id,new Date(Date.now()-60000).toISOString());
  if (!claim.changes) return;
  try {
    const url = `${publicBaseUrl()}/hub/manage`, label = row.service === 'gym' ? 'Gym' : 'Padel';
    await sendEmailMessage(HUB_CONTACTS[row.service].email, {subject:`Midpoint ${label}: new request`,text:`A new ${label} request is ready in the protected Hub workspace. Sign in to review it: ${url}\nReference: ${id}`,html:`<p>A new ${label} request is ready.</p><p><a href="${url}">Sign in to the Hub workspace</a> to review it.</p>`}, `hub-request-${id}`);
    db.prepare("UPDATE hub_requests SET notification='sent',updated_at=? WHERE id=?").run(new Date().toISOString(),id);
  } catch { db.prepare("UPDATE hub_requests SET notification='failed',updated_at=? WHERE id=?").run(new Date().toISOString(),id); }
}
