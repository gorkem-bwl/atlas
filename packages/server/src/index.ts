import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startSyncWorker, stopSyncWorker } from './jobs/sync-worker';
import { startSyncScheduler, stopSyncScheduler } from './jobs/sync-scheduler';
import { purgeOldArchivedDrawings } from './services/drawing.service';
import { runScheduledBackup } from './services/backup.service';
import { runMigrations } from './db/migrate';
import { closeDb } from './config/database';
import { getTenantBySlug, createTenant } from './services/platform/tenant.service';

const PURGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
let purgeTimer: ReturnType<typeof setInterval> | null = null;
let backupTimer: ReturnType<typeof setInterval> | null = null;

const app = createApp();

app.listen(env.PORT, async () => {
  logger.info(`Atlas server running on port ${env.PORT} in ${env.NODE_ENV} mode`);

  // Start background sync infrastructure (requires Redis)
  const workerStarted = startSyncWorker();
  if (workerStarted) {
    startSyncScheduler();
    logger.info('Email sync worker and scheduler started');
  }

  // Run database migrations (unified PostgreSQL)
  try {
    await runMigrations();
  } catch (err) {
    logger.error({ err }, 'Database migration failed');
    process.exit(1);
  }

  // Auto-create a dev tenant for local development
  try {
    const existing = await getTenantBySlug('dev');
    if (!existing) {
      const devOwnerId = '00000000-0000-0000-0000-000000000000';
      await createTenant({ slug: 'dev', name: 'Dev Tenant', plan: 'enterprise' }, devOwnerId);
      logger.info('Auto-created dev tenant');
    }
    logger.info('Platform services initialized');
  } catch (err) {
    logger.error({ err }, 'Platform initialization failed');
  }

  // Auto-purge archived drawings older than 30 days (runs every hour)
  purgeTimer = setInterval(async () => {
    try { await purgeOldArchivedDrawings(); } catch (err) {
      logger.error({ err }, 'Drawing auto-purge failed');
    }
  }, PURGE_INTERVAL_MS);

  // Run once on startup after a short delay
  setTimeout(() => purgeOldArchivedDrawings().catch(() => {}), 5000);

  // Automated database backups — daily (PostgreSQL)
  backupTimer = setInterval(() => {
    runScheduledBackup().catch((err) => {
      logger.error({ err }, 'Scheduled backup failed');
    });
  }, BACKUP_INTERVAL_MS);

  // Run initial backup 30 seconds after startup
  setTimeout(() => runScheduledBackup().catch(() => {}), 30000);
  logger.info('Automated daily backups enabled');
});

// Graceful shutdown
function handleShutdown(signal: string) {
  logger.info({ signal }, 'Received shutdown signal, cleaning up');

  if (purgeTimer) { clearInterval(purgeTimer); purgeTimer = null; }
  if (backupTimer) { clearInterval(backupTimer); backupTimer = null; }
  stopSyncScheduler();

  Promise.all([
    stopSyncWorker(),
    closeDb(),
  ])
    .then(() => {
      logger.info('All workers stopped');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Error stopping workers');
      process.exit(1);
    });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced exit after shutdown timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
