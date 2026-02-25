import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { env } from './env';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Ensure the directory exists for the database file
const dbPath = env.DATABASE_URL;
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');
// Enforce foreign key constraints (off by default in SQLite)
sqlite.pragma('foreign_keys = ON');

// ---- Auto-migration for new columns & FTS5 --------------------------------

// Add watch_expiration column to accounts (no-op if already exists)
try {
  sqlite.prepare(`ALTER TABLE accounts ADD COLUMN watch_expiration INTEGER`).run();
} catch { /* column already exists */ }

// Add body_html_compressed column to emails (no-op if already exists)
try {
  sqlite.prepare(`ALTER TABLE emails ADD COLUMN body_html_compressed TEXT`).run();
} catch { /* column already exists */ }

// Add new columns to contacts table for Google People API enrichment
for (const col of [
  `emails TEXT NOT NULL DEFAULT '[]'`,
  `given_name TEXT`,
  `family_name TEXT`,
  `photo_url TEXT`,
  `phone_numbers TEXT NOT NULL DEFAULT '[]'`,
  `organization TEXT`,
  `job_title TEXT`,
  `notes TEXT`,
  `google_resource_name TEXT`,
  `createdAt TEXT`,
  `updatedAt TEXT`,
]) {
  try {
    sqlite.prepare(`ALTER TABLE contacts ADD COLUMN ${col}`).run();
  } catch { /* column already exists */ }
}

// ---- Calendar tables --------------------------------------------------------

sqlite.prepare(`
  CREATE TABLE IF NOT EXISTS calendars (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    google_calendar_id TEXT NOT NULL,
    summary TEXT,
    description TEXT,
    background_color TEXT,
    foreground_color TEXT,
    time_zone TEXT,
    access_role TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    is_selected INTEGER NOT NULL DEFAULT 1,
    sync_token TEXT,
    last_sync_at TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`).run();

sqlite.prepare(`
  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    google_event_id TEXT NOT NULL,
    summary TEXT,
    description TEXT,
    location TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_all_day INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'confirmed',
    self_response_status TEXT,
    html_link TEXT,
    hangout_link TEXT,
    organizer TEXT,
    attendees TEXT,
    recurrence TEXT,
    recurring_event_id TEXT,
    color_id TEXT,
    reminders TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`).run();

// Calendar indexes
try { sqlite.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_calendars_account_google ON calendars(account_id, google_calendar_id)`).run(); } catch { /* */ }
try { sqlite.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_cal_events_account_google ON calendar_events(account_id, google_event_id)`).run(); } catch { /* */ }
try { sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_cal_events_calendar ON calendar_events(calendar_id)`).run(); } catch { /* */ }
try { sqlite.prepare(`CREATE INDEX IF NOT EXISTS idx_cal_events_time_range ON calendar_events(account_id, start_time, end_time)`).run(); } catch { /* */ }

// Create FTS5 virtual table for full-text search across emails.
// content='' means we manage the index manually (external content table).
sqlite.prepare(`
  CREATE VIRTUAL TABLE IF NOT EXISTS email_fts USING fts5(
    subject, body_text, from_address, from_name,
    content='',
    contentless_delete=1,
    tokenize='porter unicode61'
  )
`).run();

export const db = drizzle(sqlite);

// Export raw sqlite handle for FTS and push-notification operations
export const rawDb: DatabaseType = sqlite;
