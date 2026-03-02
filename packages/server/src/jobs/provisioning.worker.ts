import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { ProvisioningAction } from '@atlasmail/shared';

// ─── Redis connection (lazy) ─────────────────────────────────────────

let connection: IORedis | null = null;
let provisioningQueue: Queue | null = null;
let provisioningWorker: Worker | null = null;

function getConnection(): IORedis | null {
  if (!env.REDIS_URL) return null;
  if (!connection) {
    connection = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on('error', (err) => {
      logger.error({ err }, 'Redis connection error (provisioning-worker)');
    });
  }
  return connection;
}

function getQueue(): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!provisioningQueue) {
    provisioningQueue = new Queue('provisioning', {
      connection: conn,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 15000 },
        removeOnComplete: { age: 86400, count: 1000 },
        removeOnFail: { age: 604800 },
      },
    });
  }
  return provisioningQueue;
}

// ─── Job Data Type ───────────────────────────────────────────────────

export interface ProvisioningJobData {
  action: ProvisioningAction;
  installationId: string;
  userId: string;
  appRole?: string;
  logEntryId: string;
}

// ─── Worker ──────────────────────────────────────────────────────────

export function startProvisioningWorker() {
  const conn = getConnection();
  if (!conn) {
    logger.info('Redis not configured — provisioning worker disabled');
    return null;
  }

  if (provisioningWorker) return provisioningWorker;

  provisioningWorker = new Worker(
    'provisioning',
    async (job: Job<ProvisioningJobData>) => {
      const log = logger.child({ jobId: job.id, action: job.data.action, installationId: job.data.installationId });
      log.info('Processing provisioning job');

      const { processProvisioningJob } = await import('../services/platform/provisioning.service');
      await processProvisioningJob(job.data);

      log.info('Provisioning job completed');
    },
    { connection: conn, concurrency: 5 },
  );

  provisioningWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, action: job?.data?.action, err }, 'Provisioning job failed');
  });

  logger.info('Provisioning worker started');
  return provisioningWorker;
}

// ─── Job Helper ──────────────────────────────────────────────────────

export async function addProvisioningJob(data: ProvisioningJobData) {
  const queue = getQueue();
  if (!queue) {
    // In development, run inline
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Redis is required for provisioning in production');
    }
    logger.warn('Redis not configured — running provisioning inline (dev mode)');
    const { processProvisioningJob } = await import('../services/platform/provisioning.service');
    await processProvisioningJob(data);
    return;
  }

  await queue.add(data.action, data, {
    jobId: `prov-${data.action}-${data.installationId}-${data.userId}-${Date.now()}`,
  });
  logger.info({ action: data.action, installationId: data.installationId, userId: data.userId }, 'Provisioning job enqueued');
}

// ─── Cleanup ─────────────────────────────────────────────────────────

export async function stopProvisioningWorker() {
  if (provisioningWorker) { await provisioningWorker.close(); provisioningWorker = null; }
  provisioningQueue = null;
  if (connection) { await connection.quit().catch(() => {}); connection = null; }
}
