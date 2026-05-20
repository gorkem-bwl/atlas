import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

// Task-level time tracking. Time is logged against a task and always
// rolls up to a project (project_id NOT NULL), so it feeds the project's
// overall time totals. active_timers holds one running timer per user;
// stopping it writes a task_time_entries row. Idempotent.
const CREATE_TASK_TIME_ENTRIES = `
  CREATE TABLE IF NOT EXISTS task_time_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    project_id uuid NOT NULL REFERENCES project_projects(id) ON DELETE CASCADE,
    duration_minutes integer NOT NULL DEFAULT 0,
    work_date varchar(10) NOT NULL,
    start_time varchar(5),
    end_time varchar(5),
    notes text,
    tags jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_task_time_entries_tenant ON task_time_entries (tenant_id);
  CREATE INDEX IF NOT EXISTS idx_task_time_entries_task ON task_time_entries (task_id);
  CREATE INDEX IF NOT EXISTS idx_task_time_entries_project ON task_time_entries (project_id);
  CREATE INDEX IF NOT EXISTS idx_task_time_entries_user_date ON task_time_entries (user_id, work_date);
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

export async function migrateTaskTimeTracking(): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query(CREATE_TASK_TIME_ENTRIES);
    await c.query(CREATE_ACTIVE_TIMERS);
    logger.debug('task-time-tracking migration applied');
  } finally {
    c.release();
  }
}
