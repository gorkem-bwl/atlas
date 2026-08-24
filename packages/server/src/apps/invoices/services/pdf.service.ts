import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { resolveInvoiceParty, resolveAttentionContact } from './invoice-party.service';
import { getTemplate } from '../templates';
import type { InvoiceTemplateProps } from '../templates/types';
import { getInvoiceSettings } from './settings.service';
import { getInvoice } from './invoice.service';
import { logger } from '../../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function generateInvoicePdf(tenantId: string, invoiceId: string): Promise<Buffer> {
  // Fetch invoice and settings in parallel
  const [invoice, settings] = await Promise.all([
    getInvoice('', tenantId, invoiceId),
    getInvoiceSettings(tenantId),
  ]);
  if (!invoice) throw new Error('Invoice not found');

  // Resolve the billed party (company or individual) and the person to
  // address, in parallel. See invoice-party.service.ts.
  const [party, contact] = await Promise.all([
    resolveInvoiceParty(invoice, tenantId),
    resolveAttentionContact(invoice, tenantId),
  ]);

  // Read logo file if exists, convert to base64
  // logoPath is a relative path under uploads/ (e.g. "{tenantId}/{filename}")
  let logoBase64: string | undefined;
  if (settings?.logoPath) {
    try {
      const uploadsRoot = path.join(__dirname, '../../../../uploads');
      const logoFullPath = path.resolve(uploadsRoot, settings.logoPath);
      // Guard against path traversal — ensure resolved path stays within uploads/
      if (!logoFullPath.startsWith(path.resolve(uploadsRoot))) {
        throw new Error('logoPath escapes uploads directory');
      }
      const logoBuffer = await fs.readFile(logoFullPath);
      const ext = path.extname(settings.logoPath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
      logoBase64 = `data:${mime};base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
      logger.warn({ err, logoPath: settings.logoPath }, 'Failed to read logo file');
    }
  }

  const templateProps: InvoiceTemplateProps = {
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      taxPercent: invoice.taxPercent,
      taxAmount: invoice.taxAmount,
      discountPercent: invoice.discountPercent,
      discountAmount: invoice.discountAmount,
      total: invoice.total,
      notes: invoice.notes,
      issueDate: invoice.issueDate instanceof Date ? invoice.issueDate.toISOString() : String(invoice.issueDate),
      dueDate: invoice.dueDate instanceof Date ? invoice.dueDate.toISOString() : String(invoice.dueDate),
    },
    lineItems: Array.isArray(invoice.lineItems) ? invoice.lineItems.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.amount,
      taxRate: li.taxRate,
    })) : [],
    branding: {
      logoBase64,
      accentColor: settings?.accentColor ?? '#13715B',
      companyName: settings?.companyName ?? undefined,
      companyAddress: settings?.companyAddress ?? undefined,
      companyCity: settings?.companyCity ?? undefined,
      companyCountry: settings?.companyCountry ?? undefined,
      companyPhone: settings?.companyPhone ?? undefined,
      companyEmail: settings?.companyEmail ?? undefined,
      companyWebsite: settings?.companyWebsite ?? undefined,
      companyTaxId: settings?.companyTaxId ?? undefined,
      paymentInstructions: settings?.paymentInstructions ?? undefined,
      bankDetails: settings?.bankDetails ?? undefined,
      footerText: settings?.footerText ?? undefined,
    },
    client: {
      // An individual's own name is the bill-to name; there is no company
      // to fall back on, so this must never render the old 'Unknown'.
      name: party?.name || 'Unknown',
      address: party?.address ?? undefined,
      postalCode: party?.postalCode ?? undefined,
      state: party?.state ?? undefined,
      country: party?.country ?? undefined,
      taxId: party?.taxId ?? undefined,
      // Suppress the attention line when the contact IS the billed party —
      // otherwise the same name prints twice.
      contactName:
        party?.kind === 'contact'
          ? undefined
          : contact?.name ?? invoice.contactName ?? undefined,
      contactEmail: contact?.email ?? invoice.contactEmail ?? undefined,
    },
  };

  const templateId = settings?.templateId || 'classic';
  const Template = getTemplate(templateId);

  // @react-pdf/renderer types expect DocumentProps but templates return Document elements
  const pdfBuffer = await renderToBuffer(React.createElement(Template, templateProps) as any);
  return Buffer.from(pdfBuffer);
}
