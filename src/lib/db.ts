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
      updated_at TEXT NOT NULL
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
