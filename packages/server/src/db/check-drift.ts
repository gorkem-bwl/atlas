/**
 * Schema drift detector (CI entrypoint).
 *
 * Problem: Drizzle schema.ts is the declared shape, but the actual DB
 * shape depends on whatever ALTER TABLE backfills have run in
 * bootstrap.ts. We've hit this twice:
 *   - project_settings.time_rounding declared but missing → /work/settings 500'd
 *   - users.is_super_admin in DB but missing from Drizzle → no type safety
 *
 * This script boots against a fresh DB, runs bootstrap, then compares
 * Drizzle's declared columns against information_schema. Any mismatch
 * fails CI with a clear diff.
 *
 * Usage: `npx tsx packages/server/src/db/check-drift.ts`
 * (bootstrapDatabase must have run first, or run this after server start)
 */
import { pool } from '../config/database';
import * as schema from './schema';
import { getTableConfig } from 'drizzle-orm/pg-core';

interface Column {
  name: string;
  dataType: string;
  nullable: boolean;
}

async function liveColumns(tableName: string): Promise<Column[]> {
  const c = await pool.connect();
  try {
    const res = await c.query<{ column_name: string; data_type: string; is_nullable: string }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );
    return res.rows.map((r) => ({
      name: r.column_name,
      dataType: r.data_type,
      nullable: r.is_nullable === 'YES',
    }));
  } finally {
    c.release();
  }
}

function drizzleColumns(table: unknown): Column[] {
  // Table shape: columns is a record of { columnType, notNull, ... }
  const cfg = getTableConfig(table as never);
  return cfg.columns.map((col) => ({
    name: col.name,
    dataType: col.dataType, // normalized name e.g. 'uuid', 'text' — not a direct match to pg's data_type
    nullable: !col.notNull,
  }));
}

async function main() {
  const tableEntries = Object.entries(schema).filter(([, v]) => {
    // Heuristic: Drizzle tables have a Symbol.for('drizzle:Name') brand.
    return typeof v === 'object' && v !== null && Symbol.for('drizzle:Name') in (v as object);
  });

  const missingFromDb: string[] = [];
  const missingFromDrizzle: string[] = [];
  const nullabilityMismatch: string[] = [];

  for (const [exportName, table] of tableEntries) {
    let dTableName: string;
    try {
      dTableName = getTableConfig(table as never).name;
    } catch {
      continue;
    }

    const declared = drizzleColumns(table);
    const live = await liveColumns(dTableName);

    if (live.length === 0) {
      missingFromDb.push(`${exportName} (table ${dTableName})`);
      continue;
    }

    const liveByName = new Map(live.map((c) => [c.name, c]));
    const declaredByName = new Map(declared.map((c) => [c.name, c]));

    for (const d of declared) {
      const l = liveByName.get(d.name);
      if (!l) {
        missingFromDb.push(`${dTableName}.${d.name}`);
        continue;
      }
      if (d.nullable !== l.nullable) {
        nullabilityMismatch.push(
          `${dTableName}.${d.name}: drizzle ${d.nullable ? 'nullable' : 'NOT NULL'} ≠ db ${l.nullable ? 'nullable' : 'NOT NULL'}`,
        );
      }
    }

    for (const l of live) {
      if (!declaredByName.has(l.name)) {
        missingFromDrizzle.push(`${dTableName}.${l.name}`);
      }
    }
  }

  const hasDrift = missingFromDb.length > 0 || missingFromDrizzle.length > 0 || nullabilityMismatch.length > 0;

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
