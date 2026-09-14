import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Durable storage boundary: this file only. Yoco integration has been
// dropped entirely (2026-09-14 decision) - FOND now takes real orders
// through this app and a facility tablet, with payment handled in person by
// staff (existing card machine or cash), independent of this system.
// Node's built-in SQLite is used deliberately so the Alpine production image
// needs no native module compilation step.

let instance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (instance) return instance;
  const path = process.env.FOND_DB_PATH ?? './data/fond.sqlite';
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      note TEXT,
      lines_json TEXT NOT NULL,
      collection_time TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      fulfillment TEXT NOT NULL DEFAULT 'collection',
      contact_number TEXT,
      company TEXT,
      building TEXT,
      whatsapp_opt_in INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      diet_json TEXT NOT NULL DEFAULT '[]',
      symbol TEXT NOT NULL DEFAULT '🍽️',
      sort_order INTEGER NOT NULL DEFAULT 0,
      available INTEGER NOT NULL DEFAULT 1,
      is_special INTEGER NOT NULL DEFAULT 0,
      special_label TEXT,
      special_price_cents INTEGER,
      updated_at TEXT NOT NULL
    );
  `);
  // Additive migration for databases created before the delivery/WhatsApp
  // fields existed (2026-09-14 later addition) - CREATE TABLE IF NOT EXISTS
  // above only helps brand-new databases, so existing SQLite files on the
  // VPS need these columns added explicitly. Safe to run on every startup:
  // each ALTER is skipped once the column already exists.
  const existingColumns = new Set(
    (db.prepare(`PRAGMA table_info(orders)`).all() as { name: string }[]).map((c) => c.name),
  );
  const migrations: [string, string][] = [
    ['fulfillment', `ALTER TABLE orders ADD COLUMN fulfillment TEXT NOT NULL DEFAULT 'collection'`],
    ['contact_number', `ALTER TABLE orders ADD COLUMN contact_number TEXT`],
    ['company', `ALTER TABLE orders ADD COLUMN company TEXT`],
    ['building', `ALTER TABLE orders ADD COLUMN building TEXT`],
    ['whatsapp_opt_in', `ALTER TABLE orders ADD COLUMN whatsapp_opt_in INTEGER NOT NULL DEFAULT 0`],
  ];
  for (const [column, sql] of migrations) {
    if (!existingColumns.has(column)) db.exec(sql);
  }
  instance = db;
  return db;
}

// Test-only: force a fresh in-memory database on the next getDb() call.
export function resetDbForTests(): void {
  instance?.close();
  instance = null;
}
