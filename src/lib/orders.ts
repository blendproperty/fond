import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { quoteCart, type CartLine } from './menu';
import { getAvailableMenu } from './menu-store';

// Real orders. Yoco is not involved anywhere in this file (that integration
// was dropped 2026-09-14) - an order created here is a real request from a
// customer or typed in by staff at the facility tablet. Payment is taken in
// person by staff, independent of this app (existing card machine or cash);
// this system's job is only to track what was ordered and its kitchen
// status, not to process payment.

export type OrderStatus = 'received' | 'accepted' | 'ready' | 'completed' | 'cancelled';
export type OrderSource = 'customer' | 'staff';
export type FulfillmentType = 'collection' | 'delivery';

export type OrderRecord = {
  id: string;
  reference: string;
  customerName: string;
  note: string | null;
  lines: CartLine[];
  collectionTime: string;
  totalCents: number;
  status: OrderStatus;
  source: OrderSource;
  createdAt: string;
  updatedAt: string;
  fulfillment: FulfillmentType;
  contactNumber: string | null;
  company: string | null;
  building: string | null;
  whatsappOptIn: boolean;
};

const ACTIVE_STATUSES: OrderStatus[] = ['received', 'accepted', 'ready'];
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['accepted', 'cancelled'],
  accepted: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

type OrderRow = {
  id: string;
  reference: string;
  customer_name: string;
  note: string | null;
  lines_json: string;
  collection_time: string;
  total_cents: number;
  status: string;
  source: string;
  created_at: string;
  updated_at: string;
  fulfillment: string;
  contact_number: string | null;
  company: string | null;
  building: string | null;
  whatsapp_opt_in: number;
};

function fromRow(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    reference: row.reference,
    customerName: row.customer_name,
    note: row.note,
    lines: JSON.parse(row.lines_json) as CartLine[],
    collectionTime: row.collection_time,
    totalCents: row.total_cents,
    status: row.status as OrderStatus,
    source: row.source as OrderSource,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fulfillment: (row.fulfillment as FulfillmentType) ?? 'collection',
    contactNumber: row.contact_number,
    company: row.company,
    building: row.building,
    whatsappOptIn: !!row.whatsapp_opt_in,
  };
}

export function createOrder(input: {
  customerName: string;
  note?: string | null;
  lines: CartLine[];
  collectionTime: string;
  source: OrderSource;
  fulfillment?: FulfillmentType;
  contactNumber?: string | null;
  company?: string | null;
  building?: string | null;
  whatsappOptIn?: boolean;
}): OrderRecord {
  const customerName = input.customerName.trim();
  if (!customerName || customerName.length > 100) throw new Error('Enter a name for this order.');
  const collectionTime = input.collectionTime.trim();
  if (!collectionTime || collectionTime.length > 100) throw new Error('Choose a collection time.');
  const note = input.note?.trim() || null;
  if (note && note.length > 300) throw new Error('Note is too long.');
  const fulfillment: FulfillmentType = input.fulfillment === 'delivery' ? 'delivery' : 'collection';
  const contactNumber = input.contactNumber?.trim() || null;
  const company = input.company?.trim() || null;
  const building = input.building?.trim() || null;
  if (fulfillment === 'delivery') {
    if (!contactNumber || contactNumber.length < 6) throw new Error('Enter a contact number for delivery.');
    if (!building || building.length < 1) throw new Error('Enter the building/office to deliver to.');
    if (contactNumber.length > 30) throw new Error('Contact number is too long.');
    if (building.length > 150) throw new Error('Building/office is too long.');
    if (company && company.length > 150) throw new Error('Company name is too long.');
  }
  const whatsappOptIn = !!input.whatsappOptIn && !!contactNumber;
  const priced = quoteCart(input.lines, getAvailableMenu()); // throws on unknown/unavailable items or bad quantities, priced against the live admin-editable menu
  const totalCents = priced.reduce((sum, line) => sum + line.subtotal, 0);
  const now = new Date().toISOString();
  // Staff-entered orders are for walk-ins/phone orders already accepted at
  // the counter, so they start life a step ahead of the customer PWA queue.
  const status: OrderStatus = input.source === 'staff' ? 'accepted' : 'received';
  const record: OrderRecord = {
    id: randomUUID(),
    reference: `FOND-${randomUUID().slice(0, 6).toUpperCase()}`,
    customerName,
    note,
    lines: input.lines,
    collectionTime,
    totalCents,
    status,
    source: input.source,
    createdAt: now,
    updatedAt: now,
    fulfillment,
    contactNumber,
    company,
    building,
    whatsappOptIn,
  };
  getDb()
    .prepare(
      `INSERT INTO orders (id, reference, customer_name, note, lines_json, collection_time, total_cents, status, source, created_at, updated_at, fulfillment, contact_number, company, building, whatsapp_opt_in)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      record.id,
      record.reference,
      record.customerName,
      record.note,
      JSON.stringify(record.lines),
      record.collectionTime,
      record.totalCents,
      record.status,
      record.source,
      record.createdAt,
      record.updatedAt,
      record.fulfillment,
      record.contactNumber,
      record.company,
      record.building,
      record.whatsappOptIn ? 1 : 0,
    );
  return record;
}

export function getOrderByReference(reference: string): OrderRecord | null {
  const row = getDb().prepare(`SELECT * FROM orders WHERE reference = ?`).get(reference) as OrderRow | undefined;
  return row ? fromRow(row) : null;
}

export function listActiveOrders(): OrderRecord[] {
  const placeholders = ACTIVE_STATUSES.map(() => '?').join(',');
  const rows = getDb()
    .prepare(`SELECT * FROM orders WHERE status IN (${placeholders}) ORDER BY created_at ASC`)
    .all(...ACTIVE_STATUSES) as OrderRow[];
  return rows.map(fromRow);
}

export function listRecentOrders(limit = 50): OrderRecord[] {
  const rows = getDb().prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`).all(limit) as OrderRow[];
  return rows.map(fromRow);
}

// Full order history for the admin panel, with optional filters — status,
// fulfillment type and a free-text search across reference/customer name.
export function searchOrders(filters: { status?: OrderStatus; fulfillment?: FulfillmentType; query?: string; limit?: number } = {}): OrderRecord[] {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (filters.status) { clauses.push('status = ?'); params.push(filters.status); }
  if (filters.fulfillment) { clauses.push('fulfillment = ?'); params.push(filters.fulfillment); }
  if (filters.query) {
    clauses.push('(reference LIKE ? OR customer_name LIKE ?)');
    const like = `%${filters.query}%`;
    params.push(like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const limit = Math.min(Math.max(filters.limit ?? 200, 1), 1000);
  const rows = getDb().prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ?`).all(...params, limit) as OrderRow[];
  return rows.map(fromRow);
}

export class OrderTransitionError extends Error {}

export function updateOrderStatus(id: string, nextStatus: OrderStatus): OrderRecord {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as OrderRow | undefined;
  if (!row) throw new OrderTransitionError('Order not found.');
  const current = fromRow(row);
  if (!VALID_TRANSITIONS[current.status].includes(nextStatus)) {
    throw new OrderTransitionError(`Cannot move an order from ${current.status} to ${nextStatus}.`);
  }
  const updatedAt = new Date().toISOString();
  db.prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).run(nextStatus, updatedAt, id);
  return { ...current, status: nextStatus, updatedAt };
}
