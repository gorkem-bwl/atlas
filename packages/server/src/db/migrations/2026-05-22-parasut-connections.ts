import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

// Per-tenant Paraşüt accounting integration. One connection row per tenant
// (enforced by a unique index on tenant_id). Uses the OAuth2
// authorization_code (OOB) flow; the client secret and OAuth tokens are
// stored AES-256-GCM encrypted by the service layer. Idempotent — safe to
// replay on every boot.
const CREATE_PARASUT_CONNECTIONS = `
  CREATE TABLE IF NOT EXISTS parasut_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    client_id text NOT NULL,
    client_secret_enc text NOT NULL,
    company_id varchar(50) NOT NULL,
    refresh_token_enc text,
    access_token_enc text,
    token_expires_at timestamptz,
    status varchar(20) NOT NULL DEFAULT 'disconnected',
    last_error text,
    connected_at timestamptz,
    last_tested_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_parasut_connections_tenant ON parasut_connections (tenant_id);
`;

// Bring dev DBs that created the earlier password-grant shape up to date.
// CREATE TABLE IF NOT EXISTS is a no-op once the table exists, so add the
// OAuth columns and drop the now-unused credential columns idempotently.
const ALIGN_PARASUT_COLUMNS = `
  ALTER TABLE parasut_connections ADD COLUMN IF NOT EXISTS refresh_token_enc text;
  ALTER TABLE parasut_connections ADD COLUMN IF NOT EXISTS access_token_enc text;
  ALTER TABLE parasut_connections ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;
  ALTER TABLE parasut_connections DROP COLUMN IF EXISTS email;
  ALTER TABLE parasut_connections DROP COLUMN IF EXISTS password_enc;
`;

export async function migrateParasutConnections(): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query(CREATE_PARASUT_CONNECTIONS);
    await c.query(ALIGN_PARASUT_COLUMNS);
    logger.debug('parasut-connections migration applied');
  } finally {
    c.release();
  }
}
