/**
 * CRM workflow multi-step migration — runs once, idempotent.
 *
 * 1. Create crm_workflow_steps table + indexes.
 * 2. Backfill: every crm_workflows row with a non-null `action` column becomes
 *    a one-step chain at position 0.
 * 3. Drop action / action_config columns from crm_workflows.
 *
 * Safe to re-run: each block is guarded by NOT EXISTS / IF NOT EXISTS / IF EXISTS.
 */

import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

export async function migrateCrmWorkflowSteps(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Create table + indexes (idempotent).
    await client.query(`
      CREATE TABLE IF NOT EXISTS crm_workflow_steps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workflow_id uuid NOT NULL REFERENCES crm_workflows(id) ON DELETE CASCADE,
        position integer NOT NULL,
        action varchar(100) NOT NULL,
        action_config jsonb NOT NULL DEFAULT '{}'::jsonb,
        condition jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_crm_workflow_steps_workflow ON crm_workflow_steps(workflow_id)`,
    );
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_workflow_steps_workflow_position ON crm_workflow_steps(workflow_id, position)`,
    );

    // 2. Backfill — only runs if the legacy `action` column still exists on
    // crm_workflows. Postgres raises 42703 (undefined_column) otherwise; we
    // swallow it because the migration has already been applied.
    try {
      const res = await client.query(`
        INSERT INTO crm_workflow_steps (workflow_id, position, action, action_config)
        SELECT w.id, 0, w.action, w.action_config
        FROM crm_workflows w
        WHERE NOT EXISTS (
          SELECT 1 FROM crm_workflow_steps s WHERE s.workflow_id = w.id
        )
        AND w.action IS NOT NULL
      `);
      if (res.rowCount && res.rowCount > 0) {
        logger.info({ backfilled: res.rowCount }, 'Backfilled crm_workflow_steps from legacy single-action workflows');
      }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code !== '42703') throw err; // undefined_column = already migrated, fine
    }

    // 3. Drop legacy columns.
    await client.query(`ALTER TABLE crm_workflows DROP COLUMN IF EXISTS action`);
    await client.query(`ALTER TABLE crm_workflows DROP COLUMN IF EXISTS action_config`);
  } finally {
    client.release();
  }
}
