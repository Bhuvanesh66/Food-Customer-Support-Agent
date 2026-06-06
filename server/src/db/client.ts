import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DB_PATH, DATA_DIR } from '../config/env.js';

const here = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

/** Lazily open (and pragma-configure) the shared SQLite connection. */
export function getDb(): Database.Database {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  return db;
}

/** Apply schema.sql (idempotent — uses CREATE TABLE IF NOT EXISTS). */
export function migrate(): void {
  const database = getDb();
  const schema = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  database.exec(schema);
}
