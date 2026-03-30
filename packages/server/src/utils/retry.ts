import { logger } from './logger';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = 5,
  baseDelay = 1000,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (err?.code === 429 || err?.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        logger.warn({ context, attempt, delay }, 'Rate limited, retrying');
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`Max retries exceeded for ${context}`, { cause: lastErr });
}
