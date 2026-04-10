import type { Request, Response } from 'express';
import * as settingsService from '../services/settings.service';
import { logger } from '../../../utils/logger';
import { getAppPermission, canAccess } from '../../../services/app-permissions.service';

// ─── Settings ───────────────────────────────────────────────────────

export async function getSettings(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'view')) {
      res.status(403).json({ success: false, error: 'No permission to view invoices' });
      return;
    }

    const tenantId = req.auth!.tenantId;
    const settings = await settingsService.getInvoiceSettings(tenantId);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error({ error }, 'Failed to get invoice settings');
    res.status(500).json({ success: false, error: 'Failed to get invoice settings' });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const perm = await getAppPermission(req.auth?.tenantId, req.auth!.userId, 'invoices');
    if (!canAccess(perm.role, 'update')) {
      res.status(403).json({ success: false, error: 'No permission to update invoice settings' });
      return;
    }

    const tenantId = req.auth!.tenantId;
    const {
      invoicePrefix, nextInvoiceNumber, defaultCurrency, defaultTaxRate,
      eFaturaEnabled, eFaturaCompanyName, eFaturaCompanyTaxId, eFaturaCompanyTaxOffice,
      eFaturaCompanyAddress, eFaturaCompanyCity, eFaturaCompanyCountry,
      eFaturaCompanyPhone, eFaturaCompanyEmail,
      templateId, logoPath, accentColor,
      companyName, companyAddress, companyCity, companyCountry,
      companyPhone, companyEmail, companyWebsite, companyTaxId,
      paymentInstructions, bankDetails, footerText,
      reminderEnabled, reminder1Days, reminder2Days, reminder3Days, endlessReminderDays,
    } = req.body;

    const settings = await settingsService.updateInvoiceSettings(tenantId, {
      invoicePrefix, nextInvoiceNumber, defaultCurrency, defaultTaxRate,
      eFaturaEnabled, eFaturaCompanyName, eFaturaCompanyTaxId, eFaturaCompanyTaxOffice,
      eFaturaCompanyAddress, eFaturaCompanyCity, eFaturaCompanyCountry,
      eFaturaCompanyPhone, eFaturaCompanyEmail,
      templateId, logoPath, accentColor,
      companyName, companyAddress, companyCity, companyCountry,
      companyPhone, companyEmail, companyWebsite, companyTaxId,
      paymentInstructions, bankDetails, footerText,
      reminderEnabled, reminder1Days, reminder2Days, reminder3Days, endlessReminderDays,
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error({ error }, 'Failed to update invoice settings');
    res.status(500).json({ success: false, error: 'Failed to update invoice settings' });
  }
}
