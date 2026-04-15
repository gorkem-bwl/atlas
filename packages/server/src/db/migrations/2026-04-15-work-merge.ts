/**
 * Work-merge migration — runs once, idempotent.
 *
 * 1. Copy task_projects rows → project_projects (map columns; skip duplicates by ID).
 * 2. Set tasks.is_private = true where project_id IS NULL.
 * 3. Collapse tenant_apps rows with app_id in {tasks, projects} into app_id = 'work'.
 *
 * Safe to call multiple times — each block is guarded by existence checks.
 */

import { pool } from '../../config/database';
import { logger } from '../../utils/logger';

export async function migrateWorkMerge(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Copy task_projects → project_projects ────────────────────────────
    // Map: title → name, keep id, tenant_id, user_id, description, color,
    //      sort_order, is_archived, created_at, updated_at.
    // Missing target columns get defaults: company_id=NULL, billable=true,
    // status='active', estimated_hours=NULL, estimated_amount=NULL,
    // start_date=NULL, end_date=NULL.
    // On conflict (same id already in project_projects) — do nothing.

    const copyResult = await client.query(`
      INSERT INTO project_projects (
        id,
        tenant_id,
        user_id,
        company_id,
        name,
        description,
        billable,
        status,
        estimated_hours,
        estimated_amount,
        start_date,
        end_date,
        color,
        is_archived,
        sort_order,
        created_at,
        updated_at
      )
      SELECT
        tp.id,
        tp.tenant_id,
        tp.user_id,
        NULL::uuid           AS company_id,
        tp.title             AS name,
        tp.description,
        true                 AS billable,
        'active'::varchar    AS status,
        NULL::real           AS estimated_hours,
        NULL::real           AS estimated_amount,
        NULL::timestamptz    AS start_date,
        NULL::timestamptz    AS end_date,
        tp.color,
        tp.is_archived,
        tp.sort_order,
        tp.created_at,
        tp.updated_at
      FROM task_projects tp
      ON CONFLICT (id) DO NOTHING
    `);

    logger.info(
      { rowsInserted: copyResult.rowCount },
      'work-merge: copied task_projects → project_projects',
    );

    // ── 2. Set tasks.is_private = true where project_id IS NULL ────────────
    const privateResult = await client.query(`
      UPDATE tasks
      SET is_private = true
      WHERE project_id IS NULL
        AND is_private = false
    `);

    logger.info(
      { rowsUpdated: privateResult.rowCount },
      'work-merge: set is_private=true for tasks without project_id',
    );

    // ── 3. Migrate tenant_apps: collapse tasks + projects → work ───────────
    // For each tenant that has a tasks or projects row:
    //   a) Insert a 'work' row (ignore if already there).
    //   b) Delete the old tasks/projects rows.

    // Reuse enabled_at, enabled_by, config from the first matched row per tenant.
    await client.query(`
      INSERT INTO tenant_apps (tenant_id, app_id, is_enabled, enabled_at, enabled_by, config, created_at, updated_at)
      SELECT DISTINCT ON (ta.tenant_id)
        ta.tenant_id,
        'work'::varchar                  AS app_id,
        true                             AS is_enabled,
        ta.enabled_at,
        ta.enabled_by,
        ta.config,
        NOW()                            AS created_at,
        NOW()                            AS updated_at
      FROM tenant_apps ta
      WHERE ta.app_id IN ('tasks', 'projects')
      ORDER BY ta.tenant_id, ta.created_at
      ON CONFLICT (tenant_id, app_id) DO NOTHING
    `);

    const deleteResult = await client.query(`
      DELETE FROM tenant_apps
      WHERE app_id IN ('tasks', 'projects')
    `);

    logger.info(
      { rowsDeleted: deleteResult.rowCount },
      'work-merge: collapsed tasks/projects tenant_apps → work',
    );

    await client.query('COMMIT');
    logger.info('work-merge migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'work-merge migration failed — rolled back');
    throw err;
  } finally {
    client.release();
  }
}
