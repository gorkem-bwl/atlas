# Part 2: Database Schemas

Both SQLite (local/Electron) and PostgreSQL (server) share the same logical
schema. Differences are noted inline where SQL dialects diverge.

---

## 2.1 PostgreSQL Schema (server — Drizzle ORM)

```sql
-- =============================================================
-- ACCOUNTS
-- =============================================================
CREATE TABLE accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    name            TEXT,
    picture_url     TEXT,
    provider        TEXT NOT NULL DEFAULT 'google',  -- 'google' | 'microsoft'
    provider_id     TEXT NOT NULL,                    -- Google sub / MS oid

    -- OAuth tokens (encrypted at rest via pgcrypto or app-level AES-256-GCM)
    access_token    TEXT NOT NULL,
    refresh_token   TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,

    -- Gmail sync cursor
    history_id      BIGINT,           -- Gmail historyId for incremental sync
    last_full_sync  TIMESTAMPTZ,      -- When last full sync completed
    last_sync       TIMESTAMPTZ,      -- When last incremental sync ran
    sync_status     TEXT NOT NULL DEFAULT 'idle',  -- 'idle'|'syncing'|'error'
    sync_error      TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_provider ON accounts(provider, provider_id);

-- =============================================================
-- THREADS
-- =============================================================
CREATE TABLE threads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    gmail_thread_id TEXT NOT NULL,     -- Gmail's thread ID (hex string)

    subject         TEXT,
    snippet         TEXT,              -- Preview text (first ~200 chars)

    -- Denormalized counts for fast list rendering
    message_count   INTEGER NOT NULL DEFAULT 0,
    unread_count    INTEGER NOT NULL DEFAULT 0,
    has_attachments BOOLEAN NOT NULL DEFAULT FALSE,

    -- Denormalized timestamps from newest message
    last_message_at TIMESTAMPTZ NOT NULL,

    -- Category assignment
    category        TEXT NOT NULL DEFAULT 'other',
    -- 'important' | 'other' | 'newsletters' | 'notifications'

    -- Gmail labels as JSONB array for flexible querying
    labels          JSONB NOT NULL DEFAULT '[]',
    -- e.g. ["INBOX","UNREAD","CATEGORY_PROMOTIONS"]

    is_starred      BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    is_trashed      BOOLEAN NOT NULL DEFAULT FALSE,
    is_spam         BOOLEAN NOT NULL DEFAULT FALSE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(account_id, gmail_thread_id)
);

CREATE INDEX idx_threads_account_category
    ON threads(account_id, category, last_message_at DESC);
CREATE INDEX idx_threads_account_labels
    ON threads USING GIN (labels);
CREATE INDEX idx_threads_last_message
    ON threads(account_id, last_message_at DESC);

-- =============================================================
-- EMAILS (individual messages within threads)
-- =============================================================
CREATE TABLE emails (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    thread_id       UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    gmail_message_id TEXT NOT NULL,     -- Gmail's message ID

    -- Envelope
    message_id_header TEXT,            -- RFC 2822 Message-ID header
    in_reply_to       TEXT,            -- In-Reply-To header
    references_header TEXT,            -- References header (space-separated)

    from_address    TEXT NOT NULL,
    from_name       TEXT,
    to_addresses    JSONB NOT NULL DEFAULT '[]',
    cc_addresses    JSONB NOT NULL DEFAULT '[]',
    bcc_addresses   JSONB NOT NULL DEFAULT '[]',
    reply_to        TEXT,

    subject         TEXT,
    snippet         TEXT,

    -- Body content
    body_text       TEXT,              -- Plain text version
    body_html       TEXT,              -- HTML version

    -- Metadata
    gmail_labels    JSONB NOT NULL DEFAULT '[]',
    is_unread       BOOLEAN NOT NULL DEFAULT TRUE,
    is_starred      BOOLEAN NOT NULL DEFAULT FALSE,
    is_draft        BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    internal_date   TIMESTAMPTZ NOT NULL,  -- Gmail's internalDate
    received_at     TIMESTAMPTZ,

    -- Size in bytes (from Gmail)
    size_estimate   INTEGER,

    -- Full-text search vector (PostgreSQL only)
    search_vector   TSVECTOR,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(account_id, gmail_message_id)
);

CREATE INDEX idx_emails_thread ON emails(thread_id, internal_date ASC);
CREATE INDEX idx_emails_account_date ON emails(account_id, internal_date DESC);
CREATE INDEX idx_emails_search ON emails USING GIN (search_vector);

-- Trigger to auto-update search_vector
CREATE OR REPLACE FUNCTION emails_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.subject, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.from_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.from_address, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.body_text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_emails_search_vector
    BEFORE INSERT OR UPDATE OF subject, from_name, from_address, body_text
    ON emails
    FOR EACH ROW
    EXECUTE FUNCTION emails_search_vector_update();

-- =============================================================
-- ATTACHMENTS
-- =============================================================
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id        UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    gmail_attachment_id TEXT,          -- Gmail attachment ID for download

    filename        TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    size            INTEGER NOT NULL,  -- bytes
    content_id      TEXT,              -- For inline images (cid:)
    is_inline       BOOLEAN NOT NULL DEFAULT FALSE,

    -- Optional: store small attachments as base64 in DB
    -- Large ones stored on S3/R2 and referenced by URL
    storage_url     TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_email ON attachments(email_id);

-- =============================================================
-- CATEGORY RULES
-- =============================================================
CREATE TABLE category_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

    -- Rule definition
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,     -- target category
    priority        INTEGER NOT NULL DEFAULT 0,  -- higher = evaluated first

    -- Rule conditions (evaluated as AND within a rule)
    conditions      JSONB NOT NULL,
    -- Example:
    -- [
    --   {"field": "from_address", "operator": "contains", "value": "@github.com"},
    --   {"field": "subject", "operator": "starts_with", "value": "["}
    -- ]

    is_system       BOOLEAN NOT NULL DEFAULT FALSE,  -- built-in vs user-created
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_category_rules_account
    ON category_rules(account_id, priority DESC);

-- =============================================================
-- USER SETTINGS
-- =============================================================
CREATE TABLE user_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE UNIQUE,

    theme           TEXT NOT NULL DEFAULT 'system',  -- 'light'|'dark'|'system'
    density         TEXT NOT NULL DEFAULT 'default',  -- 'compact'|'default'|'comfortable'
    shortcuts_preset TEXT NOT NULL DEFAULT 'superhuman', -- 'superhuman'|'gmail'|'custom'

    -- Custom shortcut overrides as JSONB
    custom_shortcuts JSONB NOT NULL DEFAULT '{}',
    -- e.g. {"archive": "e", "reply": "r", "reply_all": "shift+r"}

    -- Reading preferences
    auto_advance     TEXT NOT NULL DEFAULT 'next',  -- 'next'|'previous'|'list'
    reading_pane     TEXT NOT NULL DEFAULT 'right',  -- 'right'|'bottom'|'hidden'

    -- Notification preferences
    desktop_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    notification_sound    BOOLEAN NOT NULL DEFAULT FALSE,

    -- Signature
    signature_html  TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- CONTACTS (for autocomplete)
-- =============================================================
CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    name            TEXT,
    frequency       INTEGER NOT NULL DEFAULT 1,  -- how often emailed
    last_contacted  TIMESTAMPTZ,

    UNIQUE(account_id, email)
);

CREATE INDEX idx_contacts_account_freq
    ON contacts(account_id, frequency DESC);
```

---

## 2.2 SQLite Schema (Electron local cache + web WASM)

```sql
-- =============================================================
-- ACCOUNTS (local mirror of server accounts)
-- =============================================================
CREATE TABLE accounts (
    id              TEXT PRIMARY KEY,   -- UUID as text
    email           TEXT NOT NULL UNIQUE,
    name            TEXT,
    picture_url     TEXT,
    provider        TEXT NOT NULL DEFAULT 'google',
    history_id      INTEGER,
    last_sync       TEXT,              -- ISO 8601 timestamp
    sync_status     TEXT NOT NULL DEFAULT 'idle'
);

-- Note: OAuth tokens are NOT stored in SQLite in the web app.
-- In Electron, tokens are stored in the OS keychain via safeStorage,
-- never in the SQLite database.

-- =============================================================
-- THREADS
-- =============================================================
CREATE TABLE threads (
    id              TEXT PRIMARY KEY,
    account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    gmail_thread_id TEXT NOT NULL,
    subject         TEXT,
    snippet         TEXT,
    message_count   INTEGER NOT NULL DEFAULT 0,
    unread_count    INTEGER NOT NULL DEFAULT 0,
    has_attachments INTEGER NOT NULL DEFAULT 0,  -- SQLite has no BOOLEAN
    last_message_at TEXT NOT NULL,               -- ISO 8601
    category        TEXT NOT NULL DEFAULT 'other',
    labels          TEXT NOT NULL DEFAULT '[]',  -- JSON array as text
    is_starred      INTEGER NOT NULL DEFAULT 0,
    is_archived     INTEGER NOT NULL DEFAULT 0,
    is_trashed      INTEGER NOT NULL DEFAULT 0,
    is_spam         INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(account_id, gmail_thread_id)
);

CREATE INDEX idx_threads_account_category
    ON threads(account_id, category, last_message_at DESC);
CREATE INDEX idx_threads_last_message
    ON threads(account_id, last_message_at DESC);

-- =============================================================
-- EMAILS
-- =============================================================
CREATE TABLE emails (
    id              TEXT PRIMARY KEY,
    account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    thread_id       TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    gmail_message_id TEXT NOT NULL,
    message_id_header TEXT,
    in_reply_to     TEXT,
    references_header TEXT,
    from_address    TEXT NOT NULL,
    from_name       TEXT,
    to_addresses    TEXT NOT NULL DEFAULT '[]',
    cc_addresses    TEXT NOT NULL DEFAULT '[]',
    bcc_addresses   TEXT NOT NULL DEFAULT '[]',
    reply_to        TEXT,
    subject         TEXT,
    snippet         TEXT,
    body_text       TEXT,
    body_html       TEXT,
    gmail_labels    TEXT NOT NULL DEFAULT '[]',
    is_unread       INTEGER NOT NULL DEFAULT 1,
    is_starred      INTEGER NOT NULL DEFAULT 0,
    is_draft        INTEGER NOT NULL DEFAULT 0,
    internal_date   TEXT NOT NULL,
    received_at     TEXT,
    size_estimate   INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(account_id, gmail_message_id)
);

CREATE INDEX idx_emails_thread ON emails(thread_id, internal_date ASC);
CREATE INDEX idx_emails_account_date ON emails(account_id, internal_date DESC);

-- =============================================================
-- FTS5 VIRTUAL TABLE FOR LOCAL SEARCH
-- =============================================================
CREATE VIRTUAL TABLE emails_fts USING fts5(
    subject,
    from_name,
    from_address,
    body_text,
    content='emails',
    content_rowid='rowid',
    tokenize='porter unicode61'
);

-- Triggers to keep FTS index in sync with emails table
CREATE TRIGGER emails_fts_insert AFTER INSERT ON emails BEGIN
    INSERT INTO emails_fts(rowid, subject, from_name, from_address, body_text)
    VALUES (NEW.rowid, NEW.subject, NEW.from_name, NEW.from_address, NEW.body_text);
END;

CREATE TRIGGER emails_fts_delete AFTER DELETE ON emails BEGIN
    INSERT INTO emails_fts(emails_fts, rowid, subject, from_name, from_address, body_text)
    VALUES ('delete', OLD.rowid, OLD.subject, OLD.from_name, OLD.from_address, OLD.body_text);
END;

CREATE TRIGGER emails_fts_update AFTER UPDATE OF subject, from_name, from_address, body_text ON emails BEGIN
    INSERT INTO emails_fts(emails_fts, rowid, subject, from_name, from_address, body_text)
    VALUES ('delete', OLD.rowid, OLD.subject, OLD.from_name, OLD.from_address, OLD.body_text);
    INSERT INTO emails_fts(rowid, subject, from_name, from_address, body_text)
    VALUES (NEW.rowid, NEW.subject, NEW.from_name, NEW.from_address, NEW.body_text);
END;

-- =============================================================
-- ATTACHMENTS
-- =============================================================
CREATE TABLE attachments (
    id              TEXT PRIMARY KEY,
    email_id        TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    gmail_attachment_id TEXT,
    filename        TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    size            INTEGER NOT NULL,
    content_id      TEXT,
    is_inline       INTEGER NOT NULL DEFAULT 0,
    -- In Electron: file path on disk; In web: not stored locally
    local_path      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_attachments_email ON attachments(email_id);

-- =============================================================
-- CATEGORY RULES (synced from server)
-- =============================================================
CREATE TABLE category_rules (
    id              TEXT PRIMARY KEY,
    account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    priority        INTEGER NOT NULL DEFAULT 0,
    conditions      TEXT NOT NULL,     -- JSON
    is_system       INTEGER NOT NULL DEFAULT 0,
    is_enabled      INTEGER NOT NULL DEFAULT 1
);

-- =============================================================
-- USER SETTINGS
-- =============================================================
CREATE TABLE user_settings (
    id              TEXT PRIMARY KEY,
    account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE UNIQUE,
    theme           TEXT NOT NULL DEFAULT 'system',
    density         TEXT NOT NULL DEFAULT 'default',
    shortcuts_preset TEXT NOT NULL DEFAULT 'superhuman',
    custom_shortcuts TEXT NOT NULL DEFAULT '{}',
    auto_advance    TEXT NOT NULL DEFAULT 'next',
    reading_pane    TEXT NOT NULL DEFAULT 'right',
    desktop_notifications INTEGER NOT NULL DEFAULT 1,
    notification_sound INTEGER NOT NULL DEFAULT 0,
    signature_html  TEXT
);

-- =============================================================
-- CONTACTS
-- =============================================================
CREATE TABLE contacts (
    id              TEXT PRIMARY KEY,
    account_id      TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    name            TEXT,
    frequency       INTEGER NOT NULL DEFAULT 1,
    last_contacted  TEXT,
    UNIQUE(account_id, email)
);

-- =============================================================
-- SYNC METADATA (local only — tracks sync state)
-- =============================================================
CREATE TABLE sync_metadata (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL
);
-- Stores: last_history_id, last_sync_timestamp, sync_page_token, etc.
```

---

## 2.3 Schema Design Notes

### Token Security
- **PostgreSQL (server):** OAuth tokens are encrypted with AES-256-GCM before
  storage. The encryption key is stored as an environment variable, never in the
  database. Drizzle custom column types handle transparent encrypt/decrypt.
- **Electron:** Tokens are stored in the OS keychain via Electron's
  `safeStorage.encryptString()`. They are never written to SQLite.
- **Web client:** Tokens are never stored client-side. All API calls go through
  the Express server which attaches the token.

### JSON Columns
PostgreSQL uses native JSONB with GIN indexes for label arrays and rule
conditions. SQLite stores the same data as JSON text and parses it in
application code. The `@atlasmail/shared` package provides typed helpers for
both.

### Why Denormalize Thread Metadata
The inbox list view needs to display subject, snippet, unread count, timestamp,
and category for each thread. Without denormalization, every list render would
require joining emails and aggregating. Denormalizing these fields onto the
threads table means the inbox query is a single indexed scan:

```sql
SELECT * FROM threads
WHERE account_id = ? AND category = ? AND is_archived = 0 AND is_trashed = 0
ORDER BY last_message_at DESC
LIMIT 50 OFFSET 0;
```

Thread metadata is updated whenever an email in that thread is inserted,
updated, or deleted (via database triggers or application-level logic).
