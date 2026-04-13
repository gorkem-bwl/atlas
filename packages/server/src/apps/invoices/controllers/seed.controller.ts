import { Request, Response } from 'express';
import { seedSampleInvoices } from '../services/seed.service';
import { logger } from '../../../utils/logger';

export async function seedInvoices(req: Request, res: Response) {
  try {
    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId;

    const result = await seedSampleInvoices(userId, tenantId);
    res.json({ success: true, data: { message: 'Seeded invoice sample data', ...result } });
  } catch (error) {
    logger.error({ error }, 'Failed to seed invoice sample data');
    res.status(500).json({ success: false, error: 'Failed to seed invoice sample data' });
  }
}
