/**
 * Schema drift detector (CI entrypoint).
 *
 * Problem: Drizzle schema.ts is the declared shape, but the actual DB
 * shape depends on whatever ALTER TABLE backfills have run in
 * bootstrap.ts. We've hit this twice:
 *   - project_settings.time_rounding declared but missing → /work/settings 500'd
 *   - users.is_super_admin in DB but missing from Drizzle → no type safety
 *
 * This script compares Drizzle's declared columns against
 * information_schema and fails CI with a clear diff on any mismatch.
 *
 * Usage: `npx tsx packages/server/src/db/check-drift.ts`
 */
import { pool } from '../config/database';
import * as schema from './schema';
import { getTableConfig } from 'drizzle-orm/pg-core';

interface Column {
  name: string;
  nullable: boolean;
}

function drizzleColumns(table: unknown): Column[] {
  const cfg = getTableConfig(table as never);
  return cfg.columns.map((col) => ({
    name: col.name,
    nullable: !col.notNull,
  }));
}

async function main() {
  // Filter schema exports down to actual Drizzle tables. getTableConfig
  // is the public API — it throws on non-tables, which is our filter.
  const tables: Array<{ exportName: string; dbName: string; table: unknown }> = [];
  for (const [exportName, value] of Object.entries(schema)) {
    try {
      const dbName = getTableConfig(value as never).name;
      tables.push({ exportName, dbName, table: value });
    } catch {
      /* not a Drizzle table — skip */
    }
  }

  // Single round-trip: grab columns for every table at once.
  const client = await pool.connect();
  let liveByTable: Map<string, Column[]>;
  try {
    const res = await client.query<{ table_name: string; column_name: string; is_nullable: string }>(
      `SELECT table_name, column_name, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [tables.map((t) => t.dbName)],
    );
    liveByTable = new Map();
    for (const row of res.rows) {
      const list = liveByTable.get(row.table_name) ?? [];
      list.push({ name: row.column_name, nullable: row.is_nullable === 'YES' });
      liveByTable.set(row.table_name, list);
    }
  } finally {
    client.release();
  }

  const missingFromDb: string[] = [];
  const missingFromDrizzle: string[] = [];
  const nullabilityMismatch: string[] = [];

  for (const { exportName, dbName, table } of tables) {
    const live = liveByTable.get(dbName) ?? [];

    if (live.length === 0) {
      missingFromDb.push(`${exportName} (table ${dbName})`);
      continue;
    }

    const declared = drizzleColumns(table);
    const liveByName = new Map(live.map((c) => [c.name, c]));
    const declaredByName = new Map(declared.map((c) => [c.name, c]));

    for (const d of declared) {
      const l = liveByName.get(d.name);
      if (!l) {
        missingFromDb.push(`${dbName}.${d.name}`);
        continue;
      }
      if (d.nullable !== l.nullable) {
        nullabilityMismatch.push(
          `${dbName}.${d.name}: drizzle ${d.nullable ? 'nullable' : 'NOT NULL'} ≠ db ${l.nullable ? 'nullable' : 'NOT NULL'}`,
        );
      }
    }

    for (const l of live) {
      if (!declaredByName.has(l.name)) {
        missingFromDrizzle.push(`${dbName}.${l.name}`);
      }
    }
  }

  const hasDrift =
    missingFromDb.length > 0 ||
    missingFromDrizzle.length > 0 ||
    nullabilityMismatch.length > 0;

  if (missingFromDb.length > 0) {
    console.error('\n✗ Columns declared in Drizzle but missing from DB:');
    missingFromDb.forEach((s) => console.error(`    ${s}`));
    console.error('  Fix: add an `addColumnIfMissing` call in db/bootstrap.ts.');
  }
  if (missingFromDrizzle.length > 0) {
    console.error('\n✗ Columns in DB but not declared in Drizzle schema:');
    missingFromDrizzle.forEach((s) => console.error(`    ${s}`));
    console.error('  Fix: add the column to schema.ts so queries can use it.');
  }
  if (nullabilityMismatch.length > 0) {
    console.error('\n✗ Nullability mismatches:');
    nullabilityMismatch.forEach((s) => console.error(`    ${s}`));
  }

  if (hasDrift) {
    console.error('\nSchema drift detected.');
    process.exit(1);
  }

  console.log('✓ Drizzle schema matches the live database.');
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('check-drift failed:', err);
  process.exit(1);
});
