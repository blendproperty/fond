import { createHash, timingSafeEqual } from 'node:crypto';
import { getDb } from './db';
import { normalizePhone } from './management';
import { providerSecret } from './provider-secrets';
import { whatChimpAllowed } from './whatchimp';
import type { OrderStatus } from './orders';

export function orderStatusAuthorized(header: string | null) {
  if (!whatChimpAllowed()) return false;
  const secret = providerSecret('whatchimp-order-status-token');
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const actual = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function phoneNumber(value: unknown) {
  if (typeof value !== 'string' || value.length > 40) return null;
  const trimmed = value.trim();
  try {
    return normalizePhone(/^[1-9]\d{7,14}$/.test(trimmed) ? `+${trimmed}` : trimmed);
  } catch { return null; }
}

// Persist across restarts/workers. Store only hashed identities and prune expired
// counters. This endpoint is for the provider's trusted system Phone Number field,
// never a number collected from a customer's text/custom field.
export function allowOrderStatusLookup(identity: string, limit: number, now = Date.now()) {
  const db = getDb();
  db.exec('CREATE TABLE IF NOT EXISTS whatsapp_lookup_limits (key TEXT PRIMARY KEY, window INTEGER NOT NULL, count INTEGER NOT NULL)');
  const window = Math.floor(now / 60000);
  db.prepare('DELETE FROM whatsapp_lookup_limits WHERE window < ?').run(window - 1);
  const key = createHash('sha256').update(identity).digest('hex');
  const row = db.prepare(`INSERT INTO whatsapp_lookup_limits VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window
    RETURNING count`).get(key, window) as { count: number };
  return row.count <= limit;
}

const unknownOrder = 'I could not find that order for this WhatsApp number. Check the full FOND order number and use the same number entered at checkout. For help, send TEAM. You can also track your order at https://midpointhub.com/fond/track.';
export function lookupWhatsAppOrderStatus(input: { reference?: unknown; phone?: unknown }, now = Date.now()) {
  const phone = phoneNumber(input.phone);
  if (!phone) return { message: unknownOrder };
  if (!allowOrderStatusLookup(phone, 12, now)) return { message: 'You have made several status checks. Please wait a minute and send TRACK again, or send TEAM for help.' };
  const reference = typeof input.reference === 'string' ? input.reference.trim().toUpperCase() : '';
  if (!/^FOND-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(reference)) {
    return { message: 'Please send TRACK again and enter the full order number from your confirmation, in the format FOND-XXXX-XXXX. For help, send TEAM.' };
  }
  // Whitelist the database fields and response; never return customer identity,
  // payment data, address, items, notes or the stored phone to WhatChimp.
  const row = getDb().prepare('SELECT display_reference,status,fulfillment,updated_at,contact_number FROM orders WHERE display_reference=? COLLATE NOCASE').get(reference) as {
    display_reference: string; status: OrderStatus; fulfillment: string; updated_at: string; contact_number: string | null;
  } | undefined;
  if (!row || phoneNumber(row.contact_number) !== phone) return { message: unknownOrder };
  const labels: Record<OrderStatus, string> = {
    received: 'Received — waiting for the FOND team to accept it.',
    accepted: 'Accepted — the FOND team has accepted your order.',
    preparing: 'Preparing — your order is being prepared.',
    ready: row.fulfillment === 'dine_in' ? 'Ready for table service at FOND. Please tell staff when you arrive.' : row.fulfillment === 'delivery' ? 'Ready — awaiting delivery.' : 'Ready — available for collection at FOND.',
    out_for_delivery: 'Out for delivery — your order is on its way.',
    completed: row.fulfillment==='dine_in'?'Completed — your dine-in order has been marked served.':'Completed — your order has been marked collected or delivered.',
    cancelled: 'Cancelled — your order has been cancelled.',
  };
  const status = labels[row.status];
  if (!status) return { message: 'I cannot confirm the current order status. Please send TEAM for help.' };
  const checked = new Intl.DateTimeFormat('en-ZA', { timeZone: 'Africa/Johannesburg', dateStyle: 'medium', timeStyle: 'short' }).format(now);
  return { message: `Order ${row.display_reference}\n${status}\n\nChecked: ${checked} SAST.\nFor another check, send TRACK. For help, send TEAM.` };
}
