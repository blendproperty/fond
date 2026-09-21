import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Durable storage boundary for orders, accounts and configuration.
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
      whatsapp_opt_in INTEGER NOT NULL DEFAULT 0,
      sms_opt_in INTEGER NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'pay_at_collection',
      payment_required INTEGER NOT NULL DEFAULT 0,
      estimated_prep_minutes INTEGER NOT NULL DEFAULT 20
    );
    CREATE TABLE IF NOT EXISTS order_submissions (
      submission_key TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      order_id TEXT NOT NULL REFERENCES orders(id)
    );
    CREATE TABLE IF NOT EXISTS order_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
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
      modifiers_json TEXT NOT NULL DEFAULT '[]',
      prep_minutes INTEGER NOT NULL DEFAULT 10,
      updated_at TEXT NOT NULL
    );
  `);
  // Additive migration for databases created before the delivery/WhatsApp
  // fields existed (2026-09-14 later addition) - CREATE TABLE IF NOT EXISTS
  // above only helps brand-new databases, so existing SQLite files on the
  // VPS need these columns added explicitly. Safe to run on every startup:
  // each ALTER is skipped once the column already exists.
  const existingOrderColumns = new Set(
    (db.prepare(`PRAGMA table_info(orders)`).all() as { name: string }[]).map((c) => c.name),
  );
  const orderMigrations: [string, string][] = [
    ['fulfillment', `ALTER TABLE orders ADD COLUMN fulfillment TEXT NOT NULL DEFAULT 'collection'`],
    ['contact_number', `ALTER TABLE orders ADD COLUMN contact_number TEXT`],
    ['company', `ALTER TABLE orders ADD COLUMN company TEXT`],
    ['building', `ALTER TABLE orders ADD COLUMN building TEXT`],
    ['whatsapp_opt_in', `ALTER TABLE orders ADD COLUMN whatsapp_opt_in INTEGER NOT NULL DEFAULT 0`],
    ['sms_opt_in', `ALTER TABLE orders ADD COLUMN sms_opt_in INTEGER NOT NULL DEFAULT 0`],
    ['user_id', `ALTER TABLE orders ADD COLUMN user_id TEXT`],
    ['customer_email', `ALTER TABLE orders ADD COLUMN customer_email TEXT`],
    ['pos_required', `ALTER TABLE orders ADD COLUMN pos_required INTEGER NOT NULL DEFAULT 0`],
    ['pos_recorded_at', `ALTER TABLE orders ADD COLUMN pos_recorded_at TEXT`],
    ['pos_recorded_by', `ALTER TABLE orders ADD COLUMN pos_recorded_by TEXT`],
    ['pos_reference', `ALTER TABLE orders ADD COLUMN pos_reference TEXT`],
    ['estimated_prep_minutes', `ALTER TABLE orders ADD COLUMN estimated_prep_minutes INTEGER NOT NULL DEFAULT 20`],
    ['payment_method', `ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'pay_at_collection'`],
    ['payment_required', `ALTER TABLE orders ADD COLUMN payment_required INTEGER NOT NULL DEFAULT 0`],
  ];
  for (const [column, sql] of orderMigrations) {
    if (!existingOrderColumns.has(column)) db.exec(sql);
  }
  const userColumns = new Set((db.prepare('PRAGMA table_info(users)').all() as { name: string }[]).map(column => column.name));
  if (!userColumns.has('email_verified_at')) db.exec('ALTER TABLE users ADD COLUMN email_verified_at TEXT');
  // Modifiers (2026-09-15 addition) - "add this / remove this" options such
  // as "extra cheese (+15)" or "no onion", stored as JSON per menu item.
  const existingMenuColumns = new Set(
    (db.prepare(`PRAGMA table_info(menu_items)`).all() as { name: string }[]).map((c) => c.name),
  );
  if (!existingMenuColumns.has('modifiers_json')) {
    db.exec(`ALTER TABLE menu_items ADD COLUMN modifiers_json TEXT NOT NULL DEFAULT '[]'`);
  }
  if (!existingMenuColumns.has('prep_minutes')) db.exec(`ALTER TABLE menu_items ADD COLUMN prep_minutes INTEGER NOT NULL DEFAULT 10`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS promotion_images (id TEXT PRIMARY KEY,mime TEXT NOT NULL,bytes BLOB NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_documents (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS provider_secrets (name TEXT PRIMARY KEY, iv BLOB NOT NULL, tag BLOB NOT NULL, ciphertext BLOB NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS email_verifications (user_id TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, sent_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS email_jobs (id TEXT PRIMARY KEY, order_id TEXT, event TEXT NOT NULL, recipient TEXT NOT NULL, status TEXT NOT NULL, provider_id TEXT, error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS team_members (id TEXT PRIMARY KEY, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS team_two_factor (member_id TEXT PRIMARY KEY, iv BLOB NOT NULL, tag BLOB NOT NULL, ciphertext BLOB NOT NULL, active INTEGER NOT NULL DEFAULT 0, recovery_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS team_sessions (token_hash TEXT PRIMARY KEY, member_id TEXT NOT NULL, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE, email TEXT, company TEXT, notes TEXT NOT NULL DEFAULT '', marketing_consent INTEGER NOT NULL DEFAULT 0, consent_note TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_events (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS payment_records (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, amount_cents INTEGER NOT NULL, method TEXT NOT NULL, reference TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS payment_reference ON payment_records(reference);
    CREATE TABLE IF NOT EXISTS yoco_checkouts (order_id TEXT PRIMARY KEY, checkout_id TEXT UNIQUE, redirect_url TEXT, status TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS webhook_receipts (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notification_jobs (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, template TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, next_at INTEGER NOT NULL, updated_at TEXT NOT NULL, UNIQUE(order_id, template));
    CREATE TABLE IF NOT EXISTS sms_jobs (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, template TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, provider_id TEXT, last_error TEXT, next_at INTEGER NOT NULL, updated_at TEXT NOT NULL, UNIQUE(order_id, template));
    CREATE UNIQUE INDEX IF NOT EXISTS sms_provider_id ON sms_jobs(provider_id) WHERE provider_id IS NOT NULL;
  `);
  instance = db;
  return db;
}

// Test-only: force a fresh in-memory database on the next getDb() call.
export function resetDbForTests(): void {
  instance?.close();
  instance = null;
}
