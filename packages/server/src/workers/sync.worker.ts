import { Queue, Worker } from 'bullmq';
import { getRedisClient } from '../config/redis';
import { performFullSync, performIncrementalSync } from '../services/gmail-sync.service';
import { performCalendarFullSync, performCalendarIncrementalSync } from '../services/calendar-sync.service';
import { db } from '../config/database';
import { accounts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';

export const SyncJobType = {
  FULL_EMAIL: 'full-email-sync',
  INCREMENTAL_EMAIL: 'incremental-email-sync',
  FULL_CALENDAR: 'full-calendar-sync',
  INCREMENTAL_CALENDAR: 'incremental-calendar-sync',
  PERIODIC: 'periodic-sync',
} as const;

let syncQueue: Queue | null = null;
let syncWorker: Worker | null = null;

export function getSyncQueue(): Queue | null {
  return syncQueue;
}

export async function enqueueSyncJob(type: string, accountId: string) {
  if (!syncQueue) throw new Error('Sync queue not available (Redis required)');
  await syncQueue.add(type, { accountId }, {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: { type: 'exponential', delay: 30_000 },
  });
}

export async function startSyncWorker() {
  const redis = getRedisClient();
  if (!redis) {
    logger.info('Redis not configured — Google sync worker disabled');
    return;
  }

  syncQueue = new Queue('google-sync', { connection: redis });

  syncWorker = new Worker('google-sync', async (job) => {
    const { accountId } = job.data;
    logger.info({ jobType: job.name, accountId }, 'Processing sync job');

    // Periodic sync dispatcher — finds active accounts and enqueues individual syncs
    if (job.name === SyncJobType.PERIODIC) {
      const activeAccounts = await db.select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.syncStatus, 'active'));

      for (const acc of activeAccounts) {
        await syncQueue!.add(SyncJobType.INCREMENTAL_EMAIL, { accountId: acc.id }, { removeOnComplete: 50 });
        await syncQueue!.add(SyncJobType.INCREMENTAL_CALENDAR, { accountId: acc.id }, { removeOnComplete: 50 });
      }
      return;
    }

    // Per-account lock to prevent duplicate syncs
    const lockKey = `sync:lock:${accountId}`;
    const locked = await redis.set(lockKey, '1', 'EX', 300, 'NX');
    if (!locked) {
      logger.info({ accountId }, 'Sync already running for account, skipping');
      return;
    }

    try {
      switch (job.name) {
        case SyncJobType.FULL_EMAIL:
          await performFullSync(accountId);
          break;
        case SyncJobType.INCREMENTAL_EMAIL:
          await performIncrementalSync(accountId);
          break;
        case SyncJobType.FULL_CALENDAR:
          await performCalendarFullSync(accountId);
          break;
        case SyncJobType.INCREMENTAL_CALENDAR:
          await performCalendarIncrementalSync(accountId);
          break;
      }
    } finally {
      await redis.del(lockKey);
    }
  }, { connection: redis, concurrency: 3 });

  syncWorker.on('failed', (job, err) => {
    logger.error({ err, jobId: job?.id, jobName: job?.name }, 'Sync job failed');
  });

  // Periodic incremental sync every 5 minutes
  await syncQueue.add(SyncJobType.PERIODIC, {}, {
    repeat: { every: 5 * 60 * 1000 },
    removeOnComplete: 5,
    removeOnFail: 5,
  });

  logger.info('Google sync worker started');
}

export async function stopSyncWorker() {
  if (syncWorker) { await syncWorker.close(); syncWorker = null; }
  if (syncQueue) { await syncQueue.close(); syncQueue = null; }
}
