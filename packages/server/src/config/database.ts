import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';
import * as schema from '../db/schema';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'PostgreSQL pool error');
});

export const db = drizzle(pool, { schema });

export { pool };

export async function closeDb() {
  await pool.end();
  logger.info('PostgreSQL connection closed');
}
