import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { serverAppRegistry } from '../apps';
import { db } from '../config/database';
import { customFieldDefinitions } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

// GET /data-model/objects — list all objects with field counts + instance counts
router.get('/objects', async (req: Request, res: Response) => {
  try {
    const tenantId = req.auth!.tenantId;
    const apps = serverAppRegistry.getAll();

    // Collect all objects from manifests
    const objects: Array<{
      id: string;
      appId: string;
      appName: string;
      appColor: string;
      name: string;
      iconName: string;
      tableName: string;
      description?: string;
      standardFieldCount: number;
      customFieldCount: number;
      totalFieldCount: number;
      instanceCount: number;
      relationCount: number;
    }> = [];

    // Get custom field counts grouped by app+recordType
    const customFieldCounts: Record<string, number> = {};
    if (tenantId) {
      const cfRows = await db
        .select({
          appId: customFieldDefinitions.appId,
          recordType: customFieldDefinitions.recordType,
          count: sql<number>`COUNT(*)`,
        })
        .from(customFieldDefinitions)
        .where(eq(customFieldDefinitions.tenantId, tenantId))
        .groupBy(customFieldDefinitions.appId, customFieldDefinitions.recordType);
      for (const row of cfRows) {
        customFieldCounts[`${row.appId}:${row.recordType}`] = Number(row.count);
      }
    }

    // Collect all objects from all apps
    const allObjects: Array<{ app: typeof apps[0]; obj: typeof apps[0]['objects'] extends (infer U)[] | undefined ? U : never }> = [];
    for (const app of apps) {
      if (!app.objects) continue;
      for (const obj of app.objects) {
        allObjects.push({ app, obj });
      }
    }

    // Batch COUNT(*) query: validate table names and build a single UNION ALL
    const tableNameRegex = /^[a-z_][a-z0-9_]*$/;
    const validTables = allObjects.filter(({ obj }) => tableNameRegex.test(obj.tableName));
    const instanceCounts: Record<string, number> = {};

    if (validTables.length > 0) {
      const unionParts = validTables.map(
        ({ obj }) => `SELECT '${obj.tableName}' AS table_name, COUNT(*) AS count FROM "${obj.tableName}"`,
      );
      try {
        const result = await db.execute(sql.raw(unionParts.join(' UNION ALL ')));
        for (const row of (result as any).rows ?? []) {
          instanceCounts[row.table_name] = Number(row.count ?? 0);
        }
      } catch {
        // Some tables might not exist yet; fall back to 0
      }
    }

    for (const { app, obj } of allObjects) {
      const cfCount = customFieldCounts[`${app.id}:${obj.id}`] ?? 0;

      objects.push({
        id: `${app.id}:${obj.id}`,
        appId: app.id,
        appName: app.name,
        appColor: app.color,
        name: obj.name,
        iconName: obj.iconName,
        tableName: obj.tableName,
        description: obj.description,
        standardFieldCount: obj.standardFields.length,
        customFieldCount: cfCount,
        totalFieldCount: obj.standardFields.length + cfCount,
        instanceCount: instanceCounts[obj.tableName] ?? 0,
        relationCount: obj.relations?.length ?? 0,
      });
    }

    res.json({ success: true, data: objects });
  } catch (err) {
    logger.error({ err }, 'Failed to list data model objects');
    res.status(500).json({ success: false, error: 'Failed to list objects' });
  }
});

// GET /data-model/objects/:appId/:objectId/fields — get fields for an object
router.get('/objects/:appId/:objectId/fields', async (req: Request, res: Response) => {
  try {
    const appId = req.params.appId as string;
    const objectId = req.params.objectId as string;
    const tenantId = req.auth!.tenantId;

    const app = serverAppRegistry.get(appId);
    if (!app?.objects) {
      res.status(404).json({ success: false, error: 'App not found' });
      return;
    }

    const obj = app.objects.find((o) => o.id === objectId);
    if (!obj) {
      res.status(404).json({ success: false, error: 'Object not found' });
      return;
    }

    // Get custom fields
    let customFields: any[] = [];
    if (tenantId) {
      customFields = await db
        .select()
        .from(customFieldDefinitions)
        .where(
          sql`${customFieldDefinitions.tenantId} = ${tenantId}
            AND ${customFieldDefinitions.appId} = ${appId}
            AND ${customFieldDefinitions.recordType} = ${objectId}`,
        );
    }

    res.json({
      success: true,
      data: {
        object: {
          id: obj.id,
          name: obj.name,
          iconName: obj.iconName,
          description: obj.description,
          relations: obj.relations ?? [],
        },
        standardFields: obj.standardFields,
        customFields,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get object fields');
    res.status(500).json({ success: false, error: 'Failed to get fields' });
  }
});

export default router;
