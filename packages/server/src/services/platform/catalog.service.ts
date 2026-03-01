import { eq, and } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../config/database';
import { appCatalog } from '../../db/schema';
import { logger } from '../../utils/logger';
import type { AtlasManifest } from '@atlasmail/shared';

export async function listCatalogApps(opts?: { category?: string }) {
  if (opts?.category) {
    return db
      .select()
      .from(appCatalog)
      .where(and(eq(appCatalog.isPublished, true), eq(appCatalog.category, opts.category)));
  }

  return db.select().from(appCatalog).where(eq(appCatalog.isPublished, true));
}

export async function getCatalogApp(manifestId: string) {
  const [app] = await db
    .select()
    .from(appCatalog)
    .where(eq(appCatalog.manifestId, manifestId))
    .limit(1);
  return app ?? null;
}

export async function getCatalogAppById(id: string) {
  const [app] = await db
    .select()
    .from(appCatalog)
    .where(eq(appCatalog.id, id))
    .limit(1);
  return app ?? null;
}

export async function upsertCatalogApp(manifest: AtlasManifest) {
  const existing = await getCatalogApp(manifest.id);

  if (existing) {
    const [updated] = await db
      .update(appCatalog)
      .set({
        name: manifest.name,
        category: manifest.category,
        tags: manifest.tags,
        iconUrl: manifest.ui.icon,
        color: manifest.ui.color,
        description: manifest.description,
        currentVersion: manifest.version,
        manifest: manifest as unknown as Record<string, unknown>,
        minPlan: manifest.minPlan,
        updatedAt: new Date(),
      })
      .where(eq(appCatalog.id, existing.id))
      .returning();

    logger.info({ manifestId: manifest.id }, 'Catalog app updated');
    return updated;
  }

  const [created] = await db
    .insert(appCatalog)
    .values({
      manifestId: manifest.id,
      name: manifest.name,
      category: manifest.category,
      tags: manifest.tags,
      iconUrl: manifest.ui.icon,
      color: manifest.ui.color,
      description: manifest.description,
      currentVersion: manifest.version,
      manifest: manifest as unknown as Record<string, unknown>,
      minPlan: manifest.minPlan,
      isPublished: true,
    })
    .returning();

  logger.info({ manifestId: manifest.id }, 'Catalog app created');
  return created;
}

/**
 * Scan `apps/` directory for atlas-manifest.json files and upsert each into the catalog.
 * Runs once on platform startup.
 */
export async function seedCatalogFromManifests() {
  const appsDir = getAppsDir();

  if (!fs.existsSync(appsDir)) {
    logger.debug('No apps/ directory found — skipping catalog seed');
    return;
  }

  const entries = fs.readdirSync(appsDir, { withFileTypes: true });
  let seeded = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const manifestPath = path.join(appsDir, entry.name, 'atlas-manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest: AtlasManifest = JSON.parse(raw);
      await upsertCatalogApp(manifest);
      seeded++;
    } catch (err) {
      logger.error({ err, app: entry.name }, 'Failed to seed catalog from manifest');
    }
  }

  if (seeded > 0) {
    logger.info({ count: seeded }, 'Catalog seeded from app manifests');
  }
}

// ---------------------------------------------------------------------------
// Disk-based fallback (for local dev without PostgreSQL)
// ---------------------------------------------------------------------------

function getAppsDir() {
  return path.resolve(__dirname, '../../../../../apps');
}

/**
 * Read catalog from disk manifests. Used when platform features are not configured.
 * Returns plain objects matching the API response shape.
 */
export function listCatalogAppsFromDisk(opts?: { category?: string }) {
  const appsDir = getAppsDir();
  if (!fs.existsSync(appsDir)) return [];

  const entries = fs.readdirSync(appsDir, { withFileTypes: true });
  const apps: Record<string, unknown>[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const manifestPath = path.join(appsDir, entry.name, 'atlas-manifest.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest: AtlasManifest = JSON.parse(raw);

      if (opts?.category && manifest.category !== opts.category) continue;

      const now = new Date().toISOString();
      apps.push({
        id: manifest.id,
        manifestId: manifest.id,
        name: manifest.name,
        category: manifest.category,
        tags: manifest.tags,
        iconUrl: manifest.ui.icon,
        color: manifest.ui.color,
        description: manifest.description,
        currentVersion: manifest.version,
        manifest,
        minPlan: manifest.minPlan,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // skip malformed manifests
    }
  }

  return apps;
}

export function getCatalogAppFromDisk(manifestId: string) {
  const all = listCatalogAppsFromDisk();
  return all.find((a) => a.manifestId === manifestId) ?? null;
}
