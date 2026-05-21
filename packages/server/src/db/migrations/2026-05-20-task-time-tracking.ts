import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

// Task time tracking. Task time is stored directly in project_time_entries
// (linked via task_id) so it rolls into project totals, the time tab,
// dashboards, reports, and billing automatically. active_timers holds one
// running timer per user; stopping it writes a project_time_entries row.
// Idempotent — safe to replay on every boot.
const ADD_TASK_ID = `
  ALTER TABLE project_time_entries ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES tasks(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_project_time_entries_task ON project_time_entries (task_id);
`;

const CREATE_ACTIVE_TIMERS = `
  CREATE TABLE IF NOT EXISTS active_timers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
    started_at timestamptz NOT NULL DEFAULT now(),
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_active_timers_user_unique ON active_timers (tenant_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_active_timers_task ON active_timers (task_id);
`;

// One-time: an earlier build stored task time in a dedicated
// task_time_entries table. Fold any such rows into project_time_entries
// and drop the table. The IF EXISTS guard makes this a no-op once done.
const MIGRATE_AND_DROP_LEGACY = `
  INSERT INTO project_time_entries
    (id, tenant_id, user_id, project_id, task_id, duration_minutes, work_date,
     start_time, end_time, notes, tags, billable, created_at, updated_at)
  SELECT id, tenant_id, user_id, project_id, task_id, duration_minutes, work_date,
     start_time, end_time, notes, tags, true, created_at, updated_at
  FROM task_time_entries
  ON CONFLICT (id) DO NOTHING;
  DROP TABLE task_time_entries;
`;

export async function migrateTaskTimeTracking(): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query(ADD_TASK_ID);
    await c.query(CREATE_ACTIVE_TIMERS);
    // Replay-safe: only runs while the legacy table still exists.
    const exists = await c.query(`SELECT to_regclass('public.task_time_entries') AS t`);
    if (exists.rows[0]?.t) {
      await c.query(MIGRATE_AND_DROP_LEGACY);
      logger.info('task-time-tracking: migrated legacy task_time_entries into project_time_entries');
    }
    logger.debug('task-time-tracking migration applied');
  } finally {
    c.release();
  }
}
