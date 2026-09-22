import { enqueueNotification } from './notifications';
import { assertTrading,settings } from './management';
import {weightedPrepMinutes} from './preparation-estimates';
import { randomUUID, createHash } from 'node:crypto';
import { getDb } from './db';
import { quoteCart, type CartLine } from './menu';
import { getAvailableMenu } from './menu-store';

// Orders track kitchen fulfilment. Optional hosted payment is managed separately
// in payments.ts; neither payment mode changes the staff acceptance workflow.
//
// Reliability (2026-09-14): order submission is idempotent via an optional
// submissionKey (so a retried network request doesn't create a duplicate
// order), and every status change is recorded in order_events for an audit
// trail, with an optional expectedStatus guard against a stale tablet
// racing another device's update.

export type OrderStatus = 'received' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type OrderSource = 'customer' | 'staff';
export type FulfillmentType = 'collection' | 'delivery';
export type PaymentMethod = 'yoco_online' | 'pay_at_collection';

export type PricedLine = CartLine & { name: string; unitPriceCents: number; subtotalCents: number; prepMinutes?:number; modifiers?: {id:string;name:string;price:number}[] };

export type OrderRecord = {
  id: string;
  reference: string;
  customerName: string;
  note: string | null;
  lines: PricedLine[];
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
  smsOptIn: boolean;
  emailOptIn: boolean;
  userId: string | null;
  customerEmail: string | null;
  posRequired: boolean;
  posRecordedAt: string | null;
  posRecordedBy: string | null;
  posReference: string | null;
  estimatedPrepMinutes:number;
  paymentMethod:PaymentMethod;
  paymentRequired:boolean;
};

const ACTIVE_STATUSES: OrderStatus[] = ['received', 'accepted', 'preparing', 'ready'];
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received: ['accepted', 'cancelled'],
  accepted: ['preparing', 'ready', 'cancelled'],
  preparing: ['ready', 'cancelled'],
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
  sms_opt_in: number;
  email_opt_in: number;
  user_id: string | null;
  customer_email: string | null;
  pos_required: number;
  pos_recorded_at: string | null;
  pos_recorded_by: string | null;
  pos_reference: string | null;
  estimated_prep_minutes:number;
  payment_method:string;
  payment_required:number;
};

function fromRow(row: OrderRow): OrderRecord {
  return {
    id: row.id,
    reference: row.reference,
    customerName: row.customer_name,
    note: row.note,
    lines: JSON.parse(row.lines_json) as PricedLine[],
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
    smsOptIn: !!row.sms_opt_in,
    emailOptIn: !!row.email_opt_in,
    userId: row.user_id,
    customerEmail: row.customer_email,
    posRequired: !!row.pos_required,
    posRecordedAt: row.pos_recorded_at,
    posRecordedBy: row.pos_recorded_by,
    posReference: row.pos_reference,
    estimatedPrepMinutes:row.estimated_prep_minutes??20,
    paymentMethod:row.payment_method==='yoco_online'?'yoco_online':'pay_at_collection',
    paymentRequired:!!row.payment_required,
  };
}

export class SubmissionConflictError extends Error {}

export function createOrder(input: {
  submissionKey?: string;
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
  smsOptIn?: boolean;
  emailOptIn?: boolean;
  actor?: string;
  userId?: string | null;
  customerEmail?: string | null;
  paymentMethod?:PaymentMethod;
}): OrderRecord {
  const db = getDb();
  const key = input.submissionKey;
  if (key !== undefined && !/^[0-9a-f-]{36}$/i.test(key)) throw new Error('Provide a valid submission key.');
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify({
        name: input.customerName,
        note: input.note ?? null,
        lines: input.lines,
        time: input.collectionTime,
        source: input.source,
        fulfillment: input.fulfillment ?? 'collection',
        phone: input.contactNumber ?? null,
        company: input.company ?? null,
        building: input.building ?? null,
        whatsappOptIn: input.whatsappOptIn ?? false,
        smsOptIn: input.smsOptIn ?? false,
        emailOptIn: input.emailOptIn ?? false,
        userId: input.userId ?? null,
        paymentMethod:input.paymentMethod??'pay_at_collection',
      }),
    )
    .digest('hex');
  db.exec('BEGIN IMMEDIATE');
  try {
    if (key) {
      const prior = db.prepare('SELECT * FROM order_submissions WHERE submission_key = ?').get(key) as
        | { fingerprint: string; order_id: string }
        | undefined;
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new SubmissionConflictError('This submission key was already used for a different order.');
        const existing = fromRow(db.prepare('SELECT * FROM orders WHERE id = ?').get(prior.order_id) as OrderRow);
        db.exec('COMMIT');
        return existing;
      }
    }
    assertTrading(input.fulfillment ?? 'collection', input.source);
    const customerName = input.customerName.trim();
    if (!customerName || customerName.length > 100) throw new Error('Enter a name for this order.');
    const collectionTime = input.collectionTime.trim();
    if (!collectionTime || collectionTime.length > 100) throw new Error('Choose a collection time.');
    const note = input.note?.trim() || null;
    if (note && note.length > 300) throw new Error('Note is too long.');
    const fulfillment: FulfillmentType = input.fulfillment === 'delivery' ? 'delivery' : 'collection';
    const paymentMethod:PaymentMethod=input.paymentMethod==='yoco_online'?'yoco_online':'pay_at_collection';
    if(input.source==='customer'&&fulfillment==='delivery'&&paymentMethod!=='yoco_online')throw new Error('Delivery orders must be paid securely online before FOND can prepare them.');
    const contactNumber = input.contactNumber?.trim() || null;
    if (!contactNumber) throw new Error('Enter a contact number so FOND can reach you about your order.');
    if (contactNumber && (contactNumber.length > 30 || !/^\+?[0-9][0-9 ()-]*$/.test(contactNumber) || contactNumber.replace(/\D/g, '').length < 6 || contactNumber.replace(/\D/g, '').length > 15)) throw new Error('Enter a valid contact number.');
    const company = input.company?.trim() || null;
    const building = input.building?.trim() || null;
    if (fulfillment === 'delivery') {
      if (!contactNumber) throw new Error('Enter a contact number for delivery.');
      if (!building || building.length < 1) throw new Error('Enter the building/office to deliver to.');
      if (building.length > 150) throw new Error('Building/office is too long.');
      if (company && company.length > 150) throw new Error('Company name is too long.');
    }
    const whatsappOptIn = !!input.whatsappOptIn && !!contactNumber;
    const smsOptIn = !!input.smsOptIn && !!contactNumber;
    const emailOptIn = !!input.emailOptIn && !!input.userId && !!input.customerEmail;
    // throws on unknown/unavailable items, bad quantities or modifiers - priced against the live admin-editable menu
    const priced = quoteCart(input.lines, getAvailableMenu());
    const totalCents = priced.reduce((sum, line) => sum + line.subtotal, 0);
    const estimatedPrepMinutes=weightedPrepMinutes(Math.max(...priced.map(line=>line.prepMinutes??10)),settings().preparationWeightPercent);
    const now = new Date().toISOString();
    // Staff-entered orders are for walk-ins/phone orders already accepted at
    // the counter, so they start life a step ahead of the customer PWA queue.
    const status: OrderStatus = input.source === 'staff' ? 'accepted' : 'received';
    const lines: PricedLine[] = priced.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      modifierIds: line.selectedModifiers.map((m) => m.id),
      modifiers: line.selectedModifiers.map(m => ({id:m.id,name:m.name,price:m.price})),
      name: line.name,
      unitPriceCents: line.unitPrice,
      subtotalCents: line.subtotal,
      prepMinutes:line.prepMinutes??10,
    }));
    const record: OrderRecord = {
      id: randomUUID(),
      reference: `FOND-${randomUUID().replaceAll('-', '').toUpperCase()}`,
      customerName,
      note,
      lines,
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
      smsOptIn,
      emailOptIn,
      userId: input.userId ?? null,
      customerEmail: input.customerEmail ?? null,
      posRequired: true,
      posRecordedAt: null,
      posRecordedBy: null,
      posReference: null,
      estimatedPrepMinutes,
      paymentMethod,
      paymentRequired:paymentMethod==='yoco_online',
    };
    db.prepare(
      `INSERT INTO orders (id, reference, customer_name, note, lines_json, collection_time, total_cents, status, source, created_at, updated_at, fulfillment, contact_number, company, building, whatsapp_opt_in, sms_opt_in, email_opt_in, user_id, customer_email, pos_required,estimated_prep_minutes,payment_method,payment_required)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
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
      record.smsOptIn ? 1 : 0,
      record.emailOptIn ? 1 : 0,
      record.userId,
      record.customerEmail,
      1,
      record.estimatedPrepMinutes,
      record.paymentMethod,
      record.paymentRequired?1:0,
    );
    if (key) db.prepare('INSERT INTO order_submissions VALUES (?, ?, ?)').run(key, fingerprint, record.id);
    db.prepare('INSERT INTO order_events VALUES (?, ?, ?, ?, ?, ?)').run(
      randomUUID(),
      record.id,
      null,
      status,
      input.source === 'staff' ? (input.actor ?? 'shared-staff-tablet') : 'customer',
      now,
    );
    db.exec('COMMIT');
    return record;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function getOrderByReference(reference: string): OrderRecord | null {
  const row = getDb().prepare(`SELECT * FROM orders WHERE reference = ?`).get(reference) as OrderRow | undefined;
  return row ? fromRow(row) : null;
}

export function listCustomerOrders(userId: string): OrderRecord[] {
  return (getDb().prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(userId) as OrderRow[]).map(fromRow);
}

export function recordPosEntry(id: string, posReference: string, actor: string): OrderRecord {
  const db = getDb();
  const reference = posReference.trim();
  if (!reference || reference.length > 100) throw new OrderTransitionError('Enter the Yoco order reference.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow | undefined;
    if (!row) throw new OrderTransitionError('Order not found.');
    const order = fromRow(row);
    if (order.status !== 'accepted') throw new OrderTransitionError('Accept the order before recording it in Yoco.');
    if (order.posRecordedAt) throw new OrderTransitionError('Yoco entry was already recorded.');
    const now = new Date().toISOString();
    db.prepare('UPDATE orders SET pos_recorded_at = ?, pos_recorded_by = ?, pos_reference = ?, updated_at = ? WHERE id = ?').run(now, actor, reference, now, id);
    db.prepare('INSERT INTO order_events VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), id, order.status, 'pos-recorded', actor, now);
    db.exec('COMMIT');
    return { ...order, posRecordedAt: now, posRecordedBy: actor, posReference: reference, updatedAt: now };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
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

export function updateOrderStatus(id: string, nextStatus: OrderStatus, expectedStatus?: OrderStatus, actor = 'shared-staff-tablet'): OrderRecord {
  const db = getDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as OrderRow | undefined;
    if (!row) throw new OrderTransitionError('Order not found.');
    const current = fromRow(row);
    if (expectedStatus && current.status !== expectedStatus) throw new OrderTransitionError('Order changed on another device. Refresh and try again.');
    if (!VALID_TRANSITIONS[current.status].includes(nextStatus)) {
      throw new OrderTransitionError(`Cannot move an order from ${current.status} to ${nextStatus}.`);
    }
    if (['preparing', 'ready'].includes(nextStatus) && current.posRequired && !current.posRecordedAt) throw new OrderTransitionError('Record the Yoco order entry before preparing this order.');
    if (nextStatus === 'accepted' && current.status === 'received') {
      const checkout = db.prepare('SELECT status FROM yoco_checkouts WHERE order_id = ?').get(id) as {status:string}|undefined;
      const paid = db.prepare("SELECT coalesce(sum(amount_cents),0) AS n FROM payment_records WHERE order_id = ? AND method = 'yoco'").get(id) as {n:number};
      if ((current.paymentRequired||checkout && ['creating','pending'].includes(checkout.status)) && paid.n < current.totalCents) throw new OrderTransitionError('Await signed Yoco payment confirmation before accepting this order.');
    }
    if (nextStatus === 'completed') {
      const paid = db.prepare('SELECT coalesce(sum(amount_cents),0) AS n FROM payment_records WHERE order_id = ?').get(id) as {n:number};
      if (paid.n < current.totalCents) throw new OrderTransitionError('Record full payment before completing this order.');
    }
    const updatedAt = new Date().toISOString();
    db.prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).run(nextStatus, updatedAt, id);
    db.prepare('INSERT INTO order_events VALUES (?, ?, ?, ?, ?, ?)').run(randomUUID(), id, current.status, nextStatus, actor, updatedAt);
    enqueueNotification(id,nextStatus);
    db.exec('COMMIT');
    return { ...current, status: nextStatus, updatedAt };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function getOrderEvents(id: string) {
  return getDb().prepare('SELECT from_status, to_status, actor, created_at FROM order_events WHERE order_id = ? ORDER BY rowid').all(id);
}
