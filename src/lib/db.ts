import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Durable storage boundary: this file only. No payment, POS or personal data
// beyond what is required for account auth and recording order *requests*
// (which are never forwarded to Yoco or a kitchen - see src/lib/yoco.ts).
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
    CREATE TABLE IF NOT EXISTS order_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      reference TEXT NOT NULL,
      lines_json TEXT NOT NULL,
      collection_time TEXT NOT NULL,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  instance = db;
  return db;
}

// Test-only: force a fresh in-memory database on the next getDb() call.
export function resetDbForTests(): void {
  instance?.close();
  instance = null;
}
