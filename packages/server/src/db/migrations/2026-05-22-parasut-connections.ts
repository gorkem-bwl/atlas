import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

// Per-tenant Paraşüt accounting integration. One connection row per tenant
// (enforced by a unique index on tenant_id). Secret fields are stored
// AES-256-GCM encrypted by the service layer. Idempotent — safe to replay
// on every boot.
const CREATE_PARASUT_CONNECTIONS = `
  CREATE TABLE IF NOT EXISTS parasut_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    client_id text NOT NULL,
    client_secret_enc text NOT NULL,
    email text NOT NULL,
    password_enc text NOT NULL,
    company_id varchar(50) NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'disconnected',
    last_error text,
    connected_at timestamptz,
    last_tested_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_parasut_connections_tenant ON parasut_connections (tenant_id);
`;

export async function migrateParasutConnections(): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query(CREATE_PARASUT_CONNECTIONS);
    logger.debug('parasut-connections migration applied');
  } finally {
    c.release();
  }
}
