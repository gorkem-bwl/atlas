import type { Request, Response } from 'express';
import { isTenantAdmin } from '@atlas-platform/shared';
import * as parasutService from '../services/parasut.service';
import { logger } from '../../../utils/logger';

// ─── Paraşüt Integration ────────────────────────────────────────────
// All handlers are admin-only: the connection is a tenant-global account
// link, the same way invoice settings are.

function ensureAdmin(req: Request, res: Response): boolean {
  if (!isTenantAdmin(req.auth?.tenantRole)) {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return false;
  }
  return true;
}

export async function getParasut(req: Request, res: Response) {
  try {
    if (!ensureAdmin(req, res)) return;
    const tenantId = req.auth!.tenantId!;
    const data = await parasutService.getConnection(tenantId);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to get Paraşüt connection');
    res.status(500).json({ success: false, error: 'Failed to get Paraşüt connection' });
  }
}

export async function saveParasut(req: Request, res: Response) {
  try {
    if (!ensureAdmin(req, res)) return;
    const tenantId = req.auth!.tenantId!;
    const { clientId, clientSecret, companyId } = req.body ?? {};

    const missing = (['clientId', 'clientSecret', 'companyId'] as const)
      .filter((k) => !req.body?.[k] || typeof req.body[k] !== 'string' || !String(req.body[k]).trim());
    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required field(s): ${missing.join(', ')}`,
      });
      return;
    }

    const data = await parasutService.saveConnection(tenantId, {
      clientId: String(clientId).trim(),
      clientSecret: String(clientSecret),
      companyId: String(companyId).trim(),
    });
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ error }, 'Failed to save Paraşüt connection');
    res.status(500).json({ success: false, error: 'Failed to save Paraşüt connection' });
  }
}

export async function getParasutAuthorizeUrl(req: Request, res: Response) {
  try {
    if (!ensureAdmin(req, res)) return;
    const tenantId = req.auth!.tenantId!;
    const url = await parasutService.getAuthorizeUrl(tenantId);
    res.json({ success: true, data: { url } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build Paraşüt authorize URL';
    logger.error({ error }, 'Failed to build Paraşüt authorize URL');
    res.status(400).json({ success: false, error: message });
  }
}

export async function connectParasut(req: Request, res: Response) {
  try {
    if (!ensureAdmin(req, res)) return;
    const tenantId = req.auth!.tenantId!;
    const { code } = req.body ?? {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      res.status(400).json({ success: false, error: 'Missing required field: code' });
      return;
    }
    const data = await parasutService.completeAuthorization(tenantId, code.trim());
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to complete Paraşüt authorization';
    logger.error({ error }, 'Failed to complete Paraşüt authorization');
    res.status(400).json({ success: false, error: message });
  }
}

export async function testParasut(req: Request, res: Response) {
  try {
    if (!ensureAdmin(req, res)) return;
    const tenantId = req.auth!.tenantId!;
    const data = await parasutService.testConnection(tenantId);
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to test Paraşüt connection';
    logger.error({ error }, 'Failed to test Paraşüt connection');
    res.status(400).json({ success: false, error: message });
  }
}

export async function deleteParasut(req: Request, res: Response) {
  try {
    if (!ensureAdmin(req, res)) return;
    const tenantId = req.auth!.tenantId!;
    await parasutService.deleteConnection(tenantId);
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error({ error }, 'Failed to delete Paraşüt connection');
    res.status(500).json({ success: false, error: 'Failed to delete Paraşüt connection' });
  }
}
