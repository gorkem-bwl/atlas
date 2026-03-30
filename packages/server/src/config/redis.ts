import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  if (!env.REDIS_URL) return null;

  try {
    redisClient = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    redisClient.on('error', (err) => logger.error({ err }, 'Redis connection error'));
    return redisClient;
  } catch (err) {
    logger.warn({ err }, 'Failed to connect to Redis');
    return null;
  }
}

export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
