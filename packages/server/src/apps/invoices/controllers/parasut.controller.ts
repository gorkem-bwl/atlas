import type { Request, Response } from 'express';
import { isTenantAdmin } from '@atlas-platform/shared';
import * as parasutService from '../services/parasut.service';
import * as invoiceService from '../services/invoice.service';
import { canAccess } from '../../../services/app-permissions.service';
import { logger } from '../../../utils/logger';

// ─── Paraşüt Integration ────────────────────────────────────────────
// Connection-management handlers are admin-only: the connection is a
// tenant-global account link, the same way invoice settings are.
// Per-invoice push/refresh use the standard invoices "update" permission.

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

// ─── Per-invoice push / payment refresh ─────────────────────────────

// Push an Atlas invoice to Paraşüt as a sales_invoice. Requires the
// connection to be 'connected' and the invoices "update" permission.
export async function pushInvoiceToParasut(req: Request, res: Response) {
  try {
    const perm = req.invoicesPerm!;
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId!;
    const id = req.params.id as string;

    const connection = await parasutService.getConnection(tenantId);
    if (!connection.connected) {
      res.status(400).json({ success: false, error: 'Paraşüt is not connected. Connect it in invoice settings first.' });
      return;
    }

    const isAdmin = perm.role === 'admin';
    const invoice = await invoiceService.getInvoice(userId, tenantId, id, isAdmin ? undefined : userId);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }

    const lineItems = invoice.lineItems ?? [];
    if (lineItems.length === 0) {
      res.status(400).json({ success: false, error: 'Cannot push an invoice with no line items' });
      return;
    }

    const company = await invoiceService.getCompanyForSync(tenantId, invoice.companyId);
    const customerName = invoice.companyName ?? company?.name ?? invoice.contactName ?? 'Customer';

    const { parasutId, parasutNo } = await parasutService.pushInvoice(
      tenantId,
      {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        currency: invoice.currency,
      },
      lineItems.map((li) => ({
        description: li.description,
        quantity: Number(li.quantity) || 0,
        unitPrice: Number(li.unitPrice) || 0,
        taxRate: Number(li.taxRate) || 0,
      })),
      {
        name: customerName,
        email: invoice.contactEmail,
        taxNumber: company?.taxId ?? null,
      },
    );

    await invoiceService.saveParasutSync(tenantId, id, parasutId, parasutNo);
    const updated = await invoiceService.getInvoice(userId, tenantId, id, isAdmin ? undefined : userId);

    res.json({ success: true, data: { invoice: updated, parasutId, parasutNo } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to push invoice to Paraşüt';
    logger.error({ error }, 'Failed to push invoice to Paraşüt');
    res.status(400).json({ success: false, error: message });
  }
}

// Pull Paraşüt payment status for a synced invoice; optionally mark the
// Atlas invoice paid when Paraşüt reports it fully paid.
export async function refreshParasutPayment(req: Request, res: Response) {
  try {
    const perm = req.invoicesPerm!;
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update invoices' });
      return;
    }

    const userId = req.auth!.userId;
    const tenantId = req.auth!.tenantId!;
    const id = req.params.id as string;

    const isAdmin = perm.role === 'admin';
    const invoice = await invoiceService.getInvoice(userId, tenantId, id, isAdmin ? undefined : userId);
    if (!invoice) {
      res.status(404).json({ success: false, error: 'Invoice not found' });
      return;
    }
    if (!invoice.parasutInvoiceId) {
      res.status(400).json({ success: false, error: 'This invoice has not been pushed to Paraşüt yet' });
      return;
    }

    const status = await parasutService.getInvoicePaymentStatus(tenantId, invoice.parasutInvoiceId);

    let markedPaid = false;
    if (status.paid && invoice.status !== 'paid') {
      await invoiceService.markInvoicePaid(userId, tenantId, id);
      markedPaid = true;
    }

    const updated = await invoiceService.getInvoice(userId, tenantId, id, isAdmin ? undefined : userId);
    res.json({ success: true, data: { invoice: updated, paymentStatus: status, markedPaid } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh Paraşüt payment status';
    logger.error({ error }, 'Failed to refresh Paraşüt payment status');
    res.status(400).json({ success: false, error: message });
  }
}

// List the tenant's existing Paraşüt invoices (read-only). Requires the
// connection to be 'connected' and the invoices "view" permission.
export async function listParasutInvoices(req: Request, res: Response) {
  try {
    const perm = req.invoicesPerm!;
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view invoices' });
      return;
    }

    const tenantId = req.auth!.tenantId!;

    const connection = await parasutService.getConnection(tenantId);
    if (!connection.connected) {
      res.status(400).json({ success: false, error: 'Paraşüt is not connected. Connect it in invoice settings first.' });
      return;
    }

    const page = parseInt(String(req.query.page ?? '1'), 10) || 1;
    const pageSize = parseInt(String(req.query.pageSize ?? '25'), 10) || 25;

    const data = await parasutService.listParasutInvoices(tenantId, { page, pageSize });
    res.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list Paraşüt invoices';
    logger.error({ error }, 'Failed to list Paraşüt invoices');
    res.status(400).json({ success: false, error: message });
  }
}
