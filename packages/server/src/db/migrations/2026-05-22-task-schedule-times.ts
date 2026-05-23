import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

// Optional scheduled time window on tasks, powering the calendar Day/Week
// hourly time-grid. Both columns nullable. Idempotent — safe to replay on
// every boot.
const ADD_TASK_SCHEDULE_TIMES = `
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_at timestamptz;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_at timestamptz;
`;

export async function migrateTaskScheduleTimes(): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query(ADD_TASK_SCHEDULE_TIMES);
    logger.debug('task-schedule-times migration applied');
  } finally {
    c.release();
  }
}
