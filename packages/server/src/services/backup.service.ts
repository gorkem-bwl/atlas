import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);
const BACKUP_DIR = join(process.cwd(), 'data', 'backups');
const MAX_DAILY_BACKUPS = 7;

/** Ensure the backup directory exists. */
function ensureBackupDir() {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

/** Generate a timestamped backup filename. */
function backupFilename(prefix: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${ts}`;
}

/**
 * Back up the PostgreSQL database using pg_dump.
 * Uses execFile (not exec) to prevent command injection.
 */
export async function backupPostgres(): Promise<string | null> {
  ensureBackupDir();

  const destFile = backupFilename('atlas');
  const destPath = join(BACKUP_DIR, destFile);

  try {
    await execFileAsync('pg_dump', [
      env.DATABASE_URL,
      '--format=custom',
      `-f`, `${destPath}.dump`,
    ], { timeout: 120000 });
    logger.info({ dest: `${destPath}.dump` }, 'PostgreSQL backup created');
    pruneBackups('atlas');
    return `${destPath}.dump`;
  } catch (err) {
    // pg_dump might not be installed — try SQL format
    try {
      const sqlPath = `${destPath}.sql`;
      await execFileAsync('pg_dump', [
        env.DATABASE_URL,
        '-f', sqlPath,
      ], { timeout: 120000 });
      logger.info({ dest: sqlPath }, 'PostgreSQL backup created (SQL format)');
      pruneBackups('atlas');
      return sqlPath;
    } catch {
      logger.warn({ err }, 'pg_dump not available — skipping PostgreSQL backup');
      return null;
    }
  }
}

/** Remove old backups, keeping only the most recent MAX_DAILY_BACKUPS. */
function pruneBackups(prefix: string) {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith(`${prefix}-`))
      .map((f) => ({
        name: f,
        path: join(BACKUP_DIR, f),
        time: statSync(join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_DAILY_BACKUPS) {
      const toRemove = files.slice(MAX_DAILY_BACKUPS);
      for (const f of toRemove) {
        unlinkSync(f.path);
        logger.info({ file: basename(f.path) }, 'Old backup pruned');
      }
    }
  } catch (err) {
    logger.warn({ err, prefix }, 'Failed to prune old backups');
  }
}

/** Run all backups. Called from the scheduled job. */
export async function runScheduledBackup() {
  logger.info('Starting scheduled backup');
  try {
    await backupPostgres();
    logger.info('Scheduled backup completed');
  } catch (err) {
    logger.error({ err }, 'Scheduled backup failed');
  }
}

/** List all existing backup files. */
export function listBackups() {
  ensureBackupDir();
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.dump') || f.endsWith('.sql'))
    .map((f) => {
      const stat = statSync(join(BACKUP_DIR, f));
      return {
        filename: f,
        size: stat.size,
        createdAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
