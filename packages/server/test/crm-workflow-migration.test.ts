/**
 * Migration idempotency tests for crm_workflow_steps.
 *
 * These tests require a real PostgreSQL connection. They are skipped when
 * MIGRATION_DB_URL is not set (the normal unit-test suite uses a mocked pool
 * via setup.ts, so we guard with a separate env var that is never set there).
 *
 * To run against a local DB:
 *   MIGRATION_DB_URL=postgresql://postgres:postgres@localhost:5432/atlas \
 *   npx vitest run test/crm-workflow-migration.test.ts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const RUN = !!process.env.MIGRATION_DB_URL;

// Lazily require pool + migration only when we have a real DB, to avoid the
// setup.ts vi.mock() intercepting the import in normal test runs.
let pool: import('pg').Pool;
let migrateCrmWorkflowSteps: () => Promise<void>;

describe.skipIf(!RUN)('crm_workflow_steps migration', () => {
  let tenantId: string;
  let workflowId: string;

  beforeAll(async () => {
    // Dynamic imports bypass the vi.mock() applied in setup.ts.
    const pg = await import('pg');
    pool = new pg.default.Pool({ connectionString: process.env.MIGRATION_DB_URL });

    const mod = await import('../src/db/migrations/2026-04-22-crm-workflow-steps');
    migrateCrmWorkflowSteps = mod.migrateCrmWorkflowSteps;

    const c = await pool.connect();
    try {
      // Wrap fixture inserts in a transaction so a failure between the tenant
      // and workflow inserts doesn't leak an orphan tenant row.
      await c.query('BEGIN');
      try {
        // Simulate a pre-migration DB by re-adding the legacy columns if they were already dropped.
        await c.query(`ALTER TABLE crm_workflows ADD COLUMN IF NOT EXISTS action varchar(100)`);
        await c.query(`ALTER TABLE crm_workflows ADD COLUMN IF NOT EXISTS action_config jsonb DEFAULT '{}'::jsonb`);

        const t = await c.query(
          `INSERT INTO tenants (id, name, slug) VALUES (gen_random_uuid(), 'test', 'test-mig-' || floor(random() * 1e9)) RETURNING id`,
        );
        const w = await c.query(
          `INSERT INTO crm_workflows (id, tenant_id, user_id, name, trigger, trigger_config, is_active, action, action_config)
           VALUES (gen_random_uuid(), $1, $1, 'legacy', 'deal_won', '{}'::jsonb, true, 'create_task', '{"taskTitle":"t"}'::jsonb)
           RETURNING id`,
          [t.rows[0].id],
        );
        await c.query('COMMIT');
        tenantId = t.rows[0].id;
        workflowId = w.rows[0].id;
      } catch (err) {
        await c.query('ROLLBACK');
        throw err;
      }
    } finally {
      c.release();
    }
  });

  afterAll(async () => {
    if (!pool) return;
    const c = await pool.connect();
    try {
      if (workflowId) {
        await c.query(`DELETE FROM crm_workflow_steps WHERE workflow_id = $1`, [workflowId]);
        await c.query(`DELETE FROM crm_workflows WHERE id = $1`, [workflowId]);
      }
      if (tenantId) {
        await c.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
      }
    } finally {
      c.release();
    }
    await pool.end();
  });

  it('creates one step per legacy workflow on first run', async () => {
    await migrateCrmWorkflowSteps();
    const c = await pool.connect();
    try {
      const r = await c.query(`SELECT * FROM crm_workflow_steps WHERE workflow_id = $1 ORDER BY position`, [workflowId]);
      expect(r.rows.length).toBe(1);
      expect(r.rows[0].action).toBe('create_task');
      expect(r.rows[0].position).toBe(0);
    } finally {
      c.release();
    }
  });

  it('is a no-op on the second run (no duplicate step rows)', async () => {
    await migrateCrmWorkflowSteps();
    const c = await pool.connect();
    try {
      const r = await c.query(`SELECT COUNT(*)::int AS n FROM crm_workflow_steps WHERE workflow_id = $1`, [workflowId]);
      expect(r.rows[0].n).toBe(1);
    } finally {
      c.release();
    }
  });

  it('drops the legacy columns', async () => {
    const c = await pool.connect();
    try {
      const r = await c.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name='crm_workflows' AND column_name IN ('action', 'action_config')
      `);
      expect(r.rows.length).toBe(0);
    } finally {
      c.release();
    }
  });
});
