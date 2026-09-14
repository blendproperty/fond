import { randomUUID } from 'node:crypto';
import { getDb } from './db';
import { quoteCart, type CartLine } from './menu';

// Durable record of an order *request* made while signed in. This is not a
// real order: nothing here is forwarded to Yoco, staff, or a kitchen printer
// (see src/lib/yoco.ts and src/app/api/orders/route.ts, which still fail
// closed with 503). It exists so genuine customer demand and the eventual
// cutover to live ordering have a real, queryable history instead of
// client-only memory that disappears on reload.

export type OrderRequestStatus = 'blocked_pending_pos_integration';

export type OrderRequestRecord = {
  id: string;
  reference: string;
  lines: CartLine[];
  collectionTime: string;
  totalCents: number;
  status: OrderRequestStatus;
  createdAt: string;
};

export function recordOrderRequest(userId: string, lines: CartLine[], collectionTime: string): OrderRequestRecord {
  const priced = quoteCart(lines); // throws on unknown items / bad quantities
  const totalCents = priced.reduce((sum, line) => sum + line.subtotal, 0);
  const record: OrderRequestRecord = {
    id: randomUUID(),
    reference: `REQ-${randomUUID().slice(0, 8).toUpperCase()}`,
    lines,
    collectionTime,
    totalCents,
    status: 'blocked_pending_pos_integration',
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO order_requests (id, user_id, reference, lines_json, collection_time, total_cents, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(record.id, userId, record.reference, JSON.stringify(record.lines), record.collectionTime, record.totalCents, record.status, record.createdAt);
  return record;
}

export function listOrderRequests(userId: string): OrderRequestRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT id, reference, lines_json, collection_time, total_cents, status, created_at
       FROM order_requests WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId) as {
    id: string;
    reference: string;
    lines_json: string;
    collection_time: string;
    total_cents: number;
    status: string;
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    lines: JSON.parse(row.lines_json) as CartLine[],
    collectionTime: row.collection_time,
    totalCents: row.total_cents,
    status: row.status as OrderRequestStatus,
    createdAt: row.created_at,
  }));
}
