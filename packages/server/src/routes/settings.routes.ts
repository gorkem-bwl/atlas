import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { db } from '../config/database';
import { userSettings } from '../db/schema';
import { settingsSchema } from '@atlasmail/shared';

import type { Request, Response } from 'express';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const [settings] = await db.select().from(userSettings)
    .where(eq(userSettings.accountId, req.auth!.accountId)).limit(1);
  res.json({ success: true, data: settings || null });
});

router.put('/', async (req: Request, res: Response) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(userSettings)
    .where(eq(userSettings.accountId, req.auth!.accountId)).limit(1);
  if (existing.length > 0) {
    const [updated] = await db.update(userSettings).set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(userSettings.accountId, req.auth!.accountId)).returning();
    res.json({ success: true, data: updated });
  } else {
    const [created] = await db.insert(userSettings).values({ accountId: req.auth!.accountId, ...parsed.data }).returning();
    res.json({ success: true, data: created });
  }
});

export default router;
