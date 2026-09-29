import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { generateOrderNumber } from './order-number';
import { allocateStaffOrderNumber } from './staff-order-number';

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
      display_reference TEXT,
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
      email_opt_in INTEGER NOT NULL DEFAULT 1,
      payment_method TEXT NOT NULL DEFAULT 'pay_at_collection',
      payment_required INTEGER NOT NULL DEFAULT 0,
      basket_prep_minutes INTEGER NOT NULL DEFAULT 20,
      queue_delay_minutes INTEGER NOT NULL DEFAULT 0,
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
    ['email_opt_in', `ALTER TABLE orders ADD COLUMN email_opt_in INTEGER NOT NULL DEFAULT 1`],
    ['user_id', `ALTER TABLE orders ADD COLUMN user_id TEXT`],
    ['customer_email', `ALTER TABLE orders ADD COLUMN customer_email TEXT`],
    ['pos_required', `ALTER TABLE orders ADD COLUMN pos_required INTEGER NOT NULL DEFAULT 0`],
    ['pos_recorded_at', `ALTER TABLE orders ADD COLUMN pos_recorded_at TEXT`],
    ['pos_recorded_by', `ALTER TABLE orders ADD COLUMN pos_recorded_by TEXT`],
    ['pos_reference', `ALTER TABLE orders ADD COLUMN pos_reference TEXT`],
    ['estimated_prep_minutes', `ALTER TABLE orders ADD COLUMN estimated_prep_minutes INTEGER NOT NULL DEFAULT 20`],
    ['basket_prep_minutes', `ALTER TABLE orders ADD COLUMN basket_prep_minutes INTEGER NOT NULL DEFAULT 20`],
    ['queue_delay_minutes', `ALTER TABLE orders ADD COLUMN queue_delay_minutes INTEGER NOT NULL DEFAULT 0`],
    ['payment_method', `ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'pay_at_collection'`],
    ['payment_required', `ALTER TABLE orders ADD COLUMN payment_required INTEGER NOT NULL DEFAULT 0`],
    ['display_reference', `ALTER TABLE orders ADD COLUMN display_reference TEXT`],
    ['staff_number', `ALTER TABLE orders ADD COLUMN staff_number TEXT`],
  ];
  for (const [column, sql] of orderMigrations) {
    if (!existingOrderColumns.has(column)) db.exec(sql);
  }
  // Customer-facing order numbers are deliberately short enough to quote at
  // the counter. The original UUID reference remains the internal payment and
  // webhook identifier. Existing orders are backfilled once on first deploy.
  const ordersWithoutDisplayReference = db.prepare('SELECT id FROM orders WHERE display_reference IS NULL').all() as {id:string}[];
  if (ordersWithoutDisplayReference.length) {
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const order of ordersWithoutDisplayReference) {
        let candidate = '';
        do candidate = generateOrderNumber();
        while (db.prepare('SELECT 1 FROM orders WHERE display_reference=?').get(candidate));
        db.prepare('UPDATE orders SET display_reference=? WHERE id=?').run(candidate, order.id);
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS order_display_reference ON orders(display_reference)');
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_order_sequence (id INTEGER PRIMARY KEY CHECK(id=1),next_number INTEGER NOT NULL);
    INSERT OR IGNORE INTO staff_order_sequence VALUES (1,100000);
    CREATE UNIQUE INDEX IF NOT EXISTS order_staff_number ON orders(staff_number);
    CREATE TABLE IF NOT EXISTS yoco_pos_matches (
      environment TEXT NOT NULL,yoco_order_id TEXT NOT NULL,order_id TEXT NOT NULL UNIQUE,
      order_number TEXT NOT NULL,matched_at TEXT NOT NULL,
      PRIMARY KEY(environment,yoco_order_id)
    );
    CREATE TABLE IF NOT EXISTS yoco_pos_sync_state (
      id INTEGER PRIMARY KEY CHECK(id=1),lease TEXT,next_run INTEGER NOT NULL DEFAULT 0,
      checked_at TEXT,error TEXT,issues_json TEXT NOT NULL DEFAULT '[]'
    );
    INSERT OR IGNORE INTO yoco_pos_sync_state(id) VALUES (1);
  `);
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE staff_order_sequence SET next_number=max(next_number,coalesce((SELECT max(CAST(staff_number AS INTEGER))+1 FROM orders),100000)) WHERE id=1').run();
    for(const order of db.prepare('SELECT id FROM orders WHERE staff_number IS NULL ORDER BY created_at,id').all() as {id:string}[]){
      db.prepare('UPDATE orders SET staff_number=? WHERE id=?').run(allocateStaffOrderNumber(db),order.id);
    }
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
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
    CREATE TABLE IF NOT EXISTS customer_two_factor (user_id TEXT PRIMARY KEY REFERENCES users(id), channel TEXT NOT NULL, phone TEXT, recovery_json TEXT NOT NULL, version TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS customer_auth_challenges (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), purpose TEXT NOT NULL, channel TEXT NOT NULL, destination TEXT NOT NULL, code_hash TEXT NOT NULL, state_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, ready INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS customer_auth_challenge_user ON customer_auth_challenges(user_id,purpose);
    CREATE TABLE IF NOT EXISTS customer_auth_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT UNIQUE, email TEXT, company TEXT, notes TEXT NOT NULL DEFAULT '', marketing_consent INTEGER NOT NULL DEFAULT 0, consent_note TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_events (id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admin_change_versions (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      area TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      reversible INTEGER NOT NULL DEFAULT 1,
      rolled_back_by TEXT,
      rolled_back_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS admin_change_versions_entity ON admin_change_versions(area,entity_id,created_at);
    CREATE TABLE IF NOT EXISTS payment_records (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, amount_cents INTEGER NOT NULL, method TEXT NOT NULL, reference TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE UNIQUE INDEX IF NOT EXISTS payment_reference ON payment_records(reference);
    CREATE TABLE IF NOT EXISTS yoco_checkouts (order_id TEXT PRIMARY KEY, checkout_id TEXT UNIQUE, redirect_url TEXT, status TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS webhook_receipts (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notification_jobs (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, template TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, next_at INTEGER NOT NULL, updated_at TEXT NOT NULL, UNIQUE(order_id, template));
    CREATE TABLE IF NOT EXISTS sms_jobs (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, template TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, provider_id TEXT, last_error TEXT, next_at INTEGER NOT NULL, updated_at TEXT NOT NULL, UNIQUE(order_id, template));
    CREATE UNIQUE INDEX IF NOT EXISTS sms_provider_id ON sms_jobs(provider_id) WHERE provider_id IS NOT NULL;
  `);
  // One-time operational configuration approved on 2026-09-28. Apply only
  // to the two managed FOND hosts, record the before/after values for owner
  // oversight, and leave a marker so a later admin edit is never overwritten.
  const configuredHost=process.env.FOND_HOST??(()=>{try{return new URL(process.env.FOND_PUBLIC_URL??'').hostname;}catch{return '';}})();
  const kitchenHoursMarker='kitchen-hours-2026-09-28-v1';
  if(['fond.mid-point.co.za','fond-test.mid-point.co.za'].includes(configuredHost)&&!db.prepare('SELECT 1 FROM app_documents WHERE key=?').get(kitchenHoursMarker)){
    const row=db.prepare('SELECT value FROM app_documents WHERE key=?').get('trading') as {value:string}|undefined;
    const before=row?JSON.parse(row.value) as Record<string,unknown>:null;
    const after={...(before??{}),closingTime:'18:30',enforceHours:true};
    const now=new Date().toISOString(),actor='release:kitchen-hours-2026-09-28';
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare('INSERT INTO app_documents VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').run('trading',JSON.stringify(after),now);
      db.prepare('INSERT INTO app_documents VALUES (?,?,?)').run(kitchenHoursMarker,JSON.stringify('applied'),now);
      db.prepare('INSERT INTO admin_change_versions (id,actor,area,entity_id,action,before_json,after_json,reversible,rolled_back_by,rolled_back_at,created_at) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?)')
        .run(randomUUID(),actor,'document','trading',before==null?'create':'update',before==null?null:JSON.stringify(before),JSON.stringify(after),1,now);
      db.prepare('INSERT INTO admin_events VALUES (?,?,?,?,?)').run(randomUUID(),actor,'save','trading',now);
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  const foodTruckHoursMarker='food-truck-hours-2026-09-28-v1';
  if(['fond.mid-point.co.za','fond-test.mid-point.co.za'].includes(configuredHost)&&!db.prepare('SELECT 1 FROM app_documents WHERE key=?').get(foodTruckHoursMarker)){
    const row=db.prepare('SELECT value FROM app_documents WHERE key=?').get('trading') as {value:string}|undefined;
    const before=row?JSON.parse(row.value) as Record<string,unknown>:null;
    const after={...(before??{}),foodTruckClosingTime:'15:30'};
    const now=new Date().toISOString(),actor='release:food-truck-hours-2026-09-28';
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare('INSERT INTO app_documents VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').run('trading',JSON.stringify(after),now);
      db.prepare('INSERT INTO app_documents VALUES (?,?,?)').run(foodTruckHoursMarker,JSON.stringify('applied'),now);
      db.prepare('INSERT INTO admin_change_versions (id,actor,area,entity_id,action,before_json,after_json,reversible,rolled_back_by,rolled_back_at,created_at) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?)')
        .run(randomUUID(),actor,'document','trading',before==null?'create':'update',before==null?null:JSON.stringify(before),JSON.stringify(after),1,now);
      db.prepare('INSERT INTO admin_events VALUES (?,?,?,?,?)').run(randomUUID(),actor,'save','trading',now);
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  const weeklyHoursMarker='weekly-trading-hours-2026-09-28-v1';
  if(['fond.mid-point.co.za','fond-test.mid-point.co.za'].includes(configuredHost)&&!db.prepare('SELECT 1 FROM app_documents WHERE key=?').get(weeklyHoursMarker)){
    const row=db.prepare('SELECT value FROM app_documents WHERE key=?').get('trading') as {value:string}|undefined;
    const before=row?JSON.parse(row.value) as Record<string,unknown>:null;
    const after={...(before??{}),openDays:[1,2,3,4,5,6],foodTruckOpenDays:[1,2,3,4,5],saturdayClosingTime:'12:00',foodTruckOpeningTime:before?.openingTime??'07:00',enforceHours:true};
    const now=new Date().toISOString(),actor='release:weekly-trading-hours-2026-09-28';
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare('INSERT INTO app_documents VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').run('trading',JSON.stringify(after),now);
      db.prepare('INSERT INTO app_documents VALUES (?,?,?)').run(weeklyHoursMarker,JSON.stringify('applied'),now);
      db.prepare('INSERT INTO admin_change_versions (id,actor,area,entity_id,action,before_json,after_json,reversible,rolled_back_by,rolled_back_at,created_at) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?)')
        .run(randomUUID(),actor,'document','trading',before==null?'create':'update',before==null?null:JSON.stringify(before),JSON.stringify(after),1,now);
      db.prepare('INSERT INTO admin_events VALUES (?,?,?,?,?)').run(randomUUID(),actor,'save','trading',now);
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_preferences (user_id TEXT PRIMARY KEY,email_enabled INTEGER NOT NULL DEFAULT 0,sms_enabled INTEGER NOT NULL DEFAULT 0,phone TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS loyalty_rewards (id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,recipient_email TEXT NOT NULL,environment TEXT NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'available',order_id TEXT,created_at TEXT NOT NULL,actor TEXT NOT NULL,reason TEXT NOT NULL,request_key TEXT UNIQUE);
    CREATE INDEX IF NOT EXISTS loyalty_recipient ON loyalty_rewards(recipient_email,environment);
    CREATE TABLE IF NOT EXISTS loyalty_orders (order_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,environment TEXT NOT NULL,quantity INTEGER NOT NULL,credited INTEGER NOT NULL DEFAULT 0,discount_cents INTEGER NOT NULL DEFAULT 0,reward_id TEXT,line_index INTEGER);
    CREATE TABLE IF NOT EXISTS loyalty_events (id TEXT PRIMARY KEY,subject TEXT NOT NULL,action TEXT NOT NULL,actor TEXT NOT NULL,detail TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS loyalty_messages (id TEXT PRIMARY KEY,reward_id TEXT NOT NULL,channel TEXT NOT NULL,recipient TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',provider_id TEXT,error TEXT,updated_at TEXT NOT NULL,UNIQUE(reward_id,channel));
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_members (user_id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS counter_reward_settings (id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 0,batch TEXT NOT NULL,variants_json TEXT NOT NULL DEFAULT '[]');
    INSERT OR IGNORE INTO counter_reward_settings (id,batch) VALUES (1,'initial');
    CREATE TABLE IF NOT EXISTS counter_reward_sales (
      id TEXT PRIMARY KEY,environment TEXT NOT NULL,yoco_id TEXT NOT NULL,order_number TEXT NOT NULL,sale_date TEXT NOT NULL,location_id TEXT NOT NULL,
      user_id TEXT NOT NULL,batch TEXT NOT NULL,quantity INTEGER NOT NULL,credited INTEGER NOT NULL,snapshot_json TEXT NOT NULL,
      actor TEXT NOT NULL,created_at TEXT NOT NULL,reversed_at TEXT,reason TEXT,checked_at TEXT,check_error TEXT,
      UNIQUE(environment,yoco_id)
    );
    CREATE TABLE IF NOT EXISTS counter_order_members (order_id TEXT PRIMARY KEY,user_id TEXT NOT NULL,environment TEXT NOT NULL,quantity INTEGER NOT NULL,sale_id TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS counter_reward_sync (id INTEGER PRIMARY KEY CHECK(id=1),next_run INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS counter_reward_member ON counter_reward_sales(user_id,environment);
    CREATE INDEX IF NOT EXISTS counter_reward_checks ON counter_reward_sales(environment,location_id,credited,checked_at);
    INSERT OR IGNORE INTO counter_reward_sync (id) VALUES (1);
  `);
  instance = db;
  return db;
}

// Test-only: force a fresh in-memory database on the next getDb() call.
export function resetDbForTests(): void {
  instance?.close();
  instance = null;
}
