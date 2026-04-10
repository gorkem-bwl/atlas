import { Router } from 'express';
import * as invoiceController from './controller';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

// Public routes (no auth)
router.get('/portal/:token/list', invoiceController.getPortalInvoices);
router.get('/portal/:token/:invoiceId', invoiceController.getPortalInvoice);

// Auth middleware
router.use(authMiddleware);

// Settings
router.get('/settings', invoiceController.getSettings);
router.patch('/settings', invoiceController.updateSettings);

// Dashboard
router.get('/dashboard', invoiceController.getInvoicesDashboard);

// Invoices
router.get('/list', invoiceController.listInvoices);
router.get('/next-number', invoiceController.getNextInvoiceNumber);
router.post('/', invoiceController.createInvoice);
router.get('/:id/pdf', invoiceController.getInvoicePdf);
router.get('/:id', invoiceController.getInvoice);
router.patch('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);
router.post('/:id/send', invoiceController.sendInvoice);
router.post('/:id/email', invoiceController.emailInvoice);
router.post('/:id/paid', invoiceController.markInvoicePaid);
router.post('/:id/waive', invoiceController.waiveInvoice);
router.post('/:id/duplicate', invoiceController.duplicateInvoice);

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
