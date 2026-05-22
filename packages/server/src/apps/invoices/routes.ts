import { Router, Request, Response, NextFunction } from 'express';
import * as invoiceController from './controller';
import { authMiddleware } from '../../middleware/auth';
import { requireAppPermission } from '../../middleware/require-app-permission';
import { withConcurrencyCheck } from '../../middleware/concurrency-check';
import { invoices, recurringInvoices } from '../../db/schema';
import { isTenantAdmin } from '@atlas-platform/shared';

function requireSeedAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isTenantAdmin(req.auth?.tenantRole)) {
    res.status(403).json({ success: false, error: 'Only organization admins can seed demo data' });
    return;
  }
  next();
}

const router = Router();

// Public routes (no auth)
router.get('/portal/:token/list', invoiceController.getPortalInvoices);
router.get('/portal/:token/:invoiceId', invoiceController.getPortalInvoice);

// Auth middleware
router.use(authMiddleware);
router.use(requireAppPermission('invoices'));

// Settings
router.get('/settings', invoiceController.getSettings);
router.patch('/settings', invoiceController.updateSettings);

// Dashboard
router.get('/dashboard', invoiceController.getInvoicesDashboard);

// Paraşüt integration (per-tenant accounting connection, admin-only)
router.get('/parasut', invoiceController.getParasut);
router.put('/parasut', invoiceController.saveParasut);
router.get('/parasut/authorize-url', invoiceController.getParasutAuthorizeUrl);
router.get('/parasut/invoices', invoiceController.listParasutInvoices);
router.get('/parasut/invoices/:id', invoiceController.getParasutInvoiceDetail);
router.post('/parasut/connect', invoiceController.connectParasut);
router.post('/parasut/test', invoiceController.testParasut);
router.post('/parasut/sync', invoiceController.syncParasut);
router.delete('/parasut', invoiceController.deleteParasut);

// Recurring Invoices
// IMPORTANT: register /recurring/... (literal) before any /:id routes so
// Express never mistakes the literal "recurring" segment for an invoice id.
router.get('/recurring', invoiceController.listRecurring);
router.post('/recurring', invoiceController.createRecurring);
router.get('/recurring/:id', invoiceController.getRecurring);
router.patch('/recurring/:id', withConcurrencyCheck(recurringInvoices), invoiceController.updateRecurring);
router.delete('/recurring/:id', invoiceController.deleteRecurring);
router.post('/recurring/:id/pause', invoiceController.pauseRecurring);
router.post('/recurring/:id/resume', invoiceController.resumeRecurring);
router.post('/recurring/:id/run-now', invoiceController.runRecurringNow);

// Seed sample data
router.post('/seed', requireSeedAdmin, invoiceController.seedInvoices);

// Invoices
router.get('/list', invoiceController.listInvoices);
router.get('/next-number', invoiceController.getNextInvoiceNumber);
router.post('/', invoiceController.createInvoice);
router.get('/:id/pdf', invoiceController.getInvoicePdf);
router.get('/:id', invoiceController.getInvoice);
router.patch('/:id', withConcurrencyCheck(invoices), invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);
router.post('/:id/send', invoiceController.sendInvoice);
router.post('/:id/email', invoiceController.emailInvoice);
router.post('/:id/paid', invoiceController.markInvoicePaid);
router.post('/:id/waive', invoiceController.waiveInvoice);
router.post('/:id/duplicate', invoiceController.duplicateInvoice);
router.post('/:id/parasut-push', invoiceController.pushInvoiceToParasut);
router.post('/:id/parasut-refresh-payment', invoiceController.refreshParasutPayment);

// Payments
// IMPORTANT: register /payments/:paymentId (literal) before any /:invoiceId/...
// routes so Express never mistakes the literal "payments" segment for an invoice id.
router.patch('/payments/:paymentId', invoiceController.updatePayment);
router.delete('/payments/:paymentId', invoiceController.deletePayment);
router.get('/:invoiceId/payments', invoiceController.listPayments);
router.post('/:invoiceId/payments', invoiceController.recordPayment);

// Line Items
router.get('/:invoiceId/line-items', invoiceController.listLineItems);
router.post('/:invoiceId/line-items', invoiceController.createLineItem);
router.patch('/:id/line-items/:itemId', invoiceController.updateLineItem);
router.delete('/:id/line-items/:itemId', invoiceController.deleteLineItem);

// e-Fatura
router.post('/:id/efatura/generate', invoiceController.generateEFatura);
router.get('/:id/efatura/xml', invoiceController.getEFaturaXml);
router.get('/:id/efatura/preview', invoiceController.getEFaturaPreview);
router.get('/:id/efatura/pdf', invoiceController.getEFaturaPdf);

export default router;
