import { mkdirSync, readdirSync, statSync, unlinkSync, copyFileSync } from 'node:fs';
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
  return `${prefix}-${ts}.db`;
}

/**
 * Back up the SQLite database by copying the file.
 * SQLite WAL mode allows safe copying while the DB is in use.
 * We issue a CHECKPOINT first to flush WAL pages into the main file.
 */
export async function backupSqlite(): Promise<string> {
  ensureBackupDir();

  // Checkpoint WAL to flush all pending writes to the main DB file
  const { rawDb } = await import('../config/database');
  rawDb.pragma('wal_checkpoint(TRUNCATE)');

  const srcPath = env.DATABASE_URL;
  const destFile = backupFilename('atlas');
  const destPath = join(BACKUP_DIR, destFile);

  copyFileSync(srcPath, destPath);
  logger.info({ dest: destPath }, 'SQLite backup created');

  // Clean up old backups
  pruneBackups('atlas');

  return destPath;
}

/**
 * Back up the PostgreSQL platform database using pg_dump.
 * Uses execFile (not exec) to prevent command injection.
 */
export async function backupPostgres(): Promise<string | null> {
  if (!env.DATABASE_PLATFORM_URL) return null;

  ensureBackupDir();

  const destFile = backupFilename('platform');
  const destPath = join(BACKUP_DIR, destFile);

  try {
    await execFileAsync('pg_dump', [
      env.DATABASE_PLATFORM_URL,
      '--format=custom',
      `-f`, destPath,
    ], { timeout: 60000 });
    logger.info({ dest: destPath }, 'PostgreSQL backup created');
    pruneBackups('platform');
    return destPath;
  } catch (err) {
    // pg_dump might not be installed — try SQL format
    try {
      const sqlPath = `${destPath}.sql`;
      await execFileAsync('pg_dump', [
        env.DATABASE_PLATFORM_URL,
        '-f', sqlPath,
      ], { timeout: 60000 });
      logger.info({ dest: sqlPath }, 'PostgreSQL backup created (SQL format)');
      pruneBackups('platform');
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
    await backupSqlite();
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
    .filter((f) => f.endsWith('.db') || f.endsWith('.sql'))
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
