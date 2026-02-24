import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env';

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool);
export { pool };
