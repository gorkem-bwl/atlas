import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import { getInvoice } from './invoice.service';
import { getInvoiceSettings } from './settings.service';
import { db } from '../../../config/database';
import { crmCompanies } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../../utils/logger';

// ─── Constants ─────────────────────────────────────────────────────

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_LEFT = 50;
const MARGIN_RIGHT = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const COLOR_BLACK = rgb(0.1, 0.1, 0.1);
const COLOR_GRAY = rgb(0.4, 0.4, 0.4);
const COLOR_LIGHT_GRAY = rgb(0.6, 0.6, 0.6);
const COLOR_TABLE_HEADER_BG = rgb(0.94, 0.94, 0.94);
const COLOR_TABLE_ALT_BG = rgb(0.98, 0.98, 0.98);
const COLOR_GREEN = rgb(0.07, 0.44, 0.36);
const COLOR_WHITE = rgb(1, 1, 1);

// ─── Helpers ───────────────────────────────────────────────────────

function formatCurrency(amount: number | null | undefined, currency?: string): string {
  const value = amount ?? 0;
  const sym = currency ?? 'USD';
  return `${value.toFixed(2)} ${sym}`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = COLOR_BLACK,
) {
  page.drawText(text, { x, y, size, font, color });
}

function drawRightAlignedText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = COLOR_BLACK,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - width, y, size, font, color });
}

/**
 * Wraps text to fit within maxWidth, returning an array of lines.
 */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ─── Main generator ────────────────────────────────────────────────

export async function generateInvoicePdf(tenantId: string, invoiceId: string): Promise<Uint8Array> {
  // 1. Fetch data
  // We pass a dummy userId since getInvoice only filters by tenantId + id
  const invoice = await getInvoice('', tenantId, invoiceId);
  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const settings = await getInvoiceSettings(tenantId);

  let company: {
    name: string;
    address?: string | null;
    taxId?: string | null;
    taxOffice?: string | null;
    postalCode?: string | null;
    state?: string | null;
    country?: string | null;
  } | null = null;

  if (invoice.companyId) {
    const [row] = await db
      .select({
        name: crmCompanies.name,
        address: crmCompanies.address,
        taxId: crmCompanies.taxId,
        taxOffice: crmCompanies.taxOffice,
        postalCode: crmCompanies.postalCode,
        state: crmCompanies.state,
        country: crmCompanies.country,
      })
      .from(crmCompanies)
      .where(eq(crmCompanies.id, invoice.companyId))
      .limit(1);
    company = row ?? null;
  }

  // 2. Create PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 50;

  const rightEdge = PAGE_WIDTH - MARGIN_RIGHT;

  // ─── Header ────────────────────────────────────────────────────

  // Company name (from settings or fallback)
  const companyHeaderName = settings?.eFaturaCompanyName || 'Company';
  drawText(page, companyHeaderName, MARGIN_LEFT, y, fontBold, 18, COLOR_BLACK);

  // "INVOICE" title on the right
  drawRightAlignedText(page, 'INVOICE', rightEdge, y, fontBold, 24, COLOR_GREEN);
  y -= 16;

  // Company details from settings
  if (settings?.eFaturaCompanyAddress) {
    drawText(page, settings.eFaturaCompanyAddress, MARGIN_LEFT, y, font, 9, COLOR_GRAY);
    y -= 12;
  }
  const cityCountryParts: string[] = [];
  if (settings?.eFaturaCompanyCity) cityCountryParts.push(settings.eFaturaCompanyCity);
  if (settings?.eFaturaCompanyCountry) cityCountryParts.push(settings.eFaturaCompanyCountry);
  if (cityCountryParts.length > 0) {
    drawText(page, cityCountryParts.join(', '), MARGIN_LEFT, y, font, 9, COLOR_GRAY);
    y -= 12;
  }
  if (settings?.eFaturaCompanyTaxId) {
    drawText(page, `Tax ID: ${settings.eFaturaCompanyTaxId}`, MARGIN_LEFT, y, font, 9, COLOR_GRAY);
    y -= 12;
  }

  // ─── Separator ─────────────────────────────────────────────────
  y -= 10;
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: rightEdge, y },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 24;

  // ─── Invoice meta + Bill-to ────────────────────────────────────

  const metaStartY = y;
  const midX = PAGE_WIDTH / 2 + 20;

  // Left: Bill to
  drawText(page, 'Bill to', MARGIN_LEFT, y, font, 9, COLOR_LIGHT_GRAY);
  y -= 16;

  if (company) {
    drawText(page, company.name, MARGIN_LEFT, y, fontBold, 11, COLOR_BLACK);
    y -= 14;

    if (company.address) {
      drawText(page, company.address, MARGIN_LEFT, y, font, 9, COLOR_GRAY);
      y -= 12;
    }
    const addrParts: string[] = [];
    if (company.state) addrParts.push(company.state);
    if (company.postalCode) addrParts.push(company.postalCode);
    if (company.country) addrParts.push(company.country);
    if (addrParts.length > 0) {
      drawText(page, addrParts.join(', '), MARGIN_LEFT, y, font, 9, COLOR_GRAY);
      y -= 12;
    }
    if (company.taxId) {
      drawText(page, `Tax ID: ${company.taxId}`, MARGIN_LEFT, y, font, 9, COLOR_GRAY);
      y -= 12;
    }
  } else if (invoice.companyName) {
    drawText(page, invoice.companyName, MARGIN_LEFT, y, fontBold, 11, COLOR_BLACK);
    y -= 14;
  }

  if (invoice.contactName) {
    drawText(page, `Contact: ${invoice.contactName}`, MARGIN_LEFT, y, font, 9, COLOR_GRAY);
    y -= 12;
  }

  // Right: Invoice meta
  let ry = metaStartY;
  const labelX = midX;
  const valueX = midX + 90;

  drawText(page, 'Invoice #:', labelX, ry, font, 9, COLOR_LIGHT_GRAY);
  drawText(page, invoice.invoiceNumber || '-', valueX, ry, fontBold, 10, COLOR_BLACK);
  ry -= 16;

  drawText(page, 'Issue date:', labelX, ry, font, 9, COLOR_LIGHT_GRAY);
  drawText(page, formatDate(invoice.issueDate), valueX, ry, font, 10, COLOR_BLACK);
  ry -= 16;

  drawText(page, 'Due date:', labelX, ry, font, 9, COLOR_LIGHT_GRAY);
  drawText(page, formatDate(invoice.dueDate), valueX, ry, font, 10, COLOR_BLACK);
  ry -= 16;

  drawText(page, 'Status:', labelX, ry, font, 9, COLOR_LIGHT_GRAY);
  const statusText = (invoice.status || 'draft').charAt(0).toUpperCase() + (invoice.status || 'draft').slice(1);
  const statusColor = invoice.status === 'paid' ? COLOR_GREEN : invoice.status === 'overdue' ? rgb(0.8, 0.2, 0.2) : COLOR_BLACK;
  drawText(page, statusText, valueX, ry, fontBold, 10, statusColor);

  // Move y to below both columns
  y = Math.min(y, ry) - 30;

  // ─── Line items table ──────────────────────────────────────────

  const colDesc = MARGIN_LEFT;
  const colQty = rightEdge - 200;
  const colPrice = rightEdge - 120;
  const colAmount = rightEdge;

  // Table header
  const headerHeight = 22;
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 4,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: COLOR_TABLE_HEADER_BG,
  });

  const headerY = y + 4;
  drawText(page, 'Description', colDesc + 6, headerY, fontBold, 9, COLOR_GRAY);
  drawRightAlignedText(page, 'Qty', colQty + 40, headerY, fontBold, 9, COLOR_GRAY);
  drawRightAlignedText(page, 'Unit price', colPrice + 60, headerY, fontBold, 9, COLOR_GRAY);
  drawRightAlignedText(page, 'Amount', colAmount, headerY, fontBold, 9, COLOR_GRAY);

  y -= (headerHeight + 4);

  // Line items
  const lineItems = invoice.lineItems || [];
  const rowHeight = 20;

  for (let i = 0; i < lineItems.length; i++) {
    // Check if we need a new page
    if (y < 120) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 50;
    }

    const li = lineItems[i];

    // Alternating row background
    if (i % 2 === 1) {
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: y - 4,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: COLOR_TABLE_ALT_BG,
      });
    }

    const description = li.description || '';
    const qty = (li.quantity ?? 0).toString();
    const unitPrice = formatCurrency(li.unitPrice, invoice.currency ?? undefined);
    const amount = formatCurrency(li.amount ?? (li.quantity ?? 0) * (li.unitPrice ?? 0), invoice.currency ?? undefined);

    // Wrap description if too long
    const descMaxWidth = colQty - colDesc - 16;
    const descLines = wrapText(description, font, 9, descMaxWidth);

    drawText(page, descLines[0] || '', colDesc + 6, y + 2, font, 9, COLOR_BLACK);
    drawRightAlignedText(page, qty, colQty + 40, y + 2, font, 9, COLOR_BLACK);
    drawRightAlignedText(page, unitPrice, colPrice + 60, y + 2, font, 9, COLOR_BLACK);
    drawRightAlignedText(page, amount, colAmount, y + 2, font, 9, COLOR_BLACK);

    y -= rowHeight;

    // Additional description lines (wrapped)
    for (let j = 1; j < descLines.length; j++) {
      drawText(page, descLines[j], colDesc + 6, y + 2, font, 9, COLOR_GRAY);
      y -= 14;
    }
  }

  // ─── Totals ────────────────────────────────────────────────────

  y -= 16;

  // Separator line above totals
  page.drawLine({
    start: { x: midX - 20, y: y + 8 },
    end: { x: rightEdge, y: y + 8 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  const totalsLabelX = midX;
  const totalsValueX = rightEdge;

  // Subtotal
  drawText(page, 'Subtotal', totalsLabelX, y, font, 9, COLOR_GRAY);
  drawRightAlignedText(page, formatCurrency(invoice.subtotal, invoice.currency ?? undefined), totalsValueX, y, font, 9, COLOR_BLACK);
  y -= 16;

  // Tax
  if (invoice.taxPercent && invoice.taxPercent > 0) {
    drawText(page, `Tax (${invoice.taxPercent}%)`, totalsLabelX, y, font, 9, COLOR_GRAY);
    drawRightAlignedText(page, formatCurrency(invoice.taxAmount, invoice.currency ?? undefined), totalsValueX, y, font, 9, COLOR_BLACK);
    y -= 16;
  }

  // Discount
  if (invoice.discountPercent && invoice.discountPercent > 0) {
    drawText(page, `Discount (${invoice.discountPercent}%)`, totalsLabelX, y, font, 9, COLOR_GRAY);
    drawRightAlignedText(page, `-${formatCurrency(invoice.discountAmount, invoice.currency ?? undefined)}`, totalsValueX, y, font, 9, COLOR_BLACK);
    y -= 16;
  }

  // Total separator
  page.drawLine({
    start: { x: midX - 20, y: y + 8 },
    end: { x: rightEdge, y: y + 8 },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });

  // Total
  drawText(page, 'Total', totalsLabelX, y, fontBold, 12, COLOR_BLACK);
  drawRightAlignedText(page, formatCurrency(invoice.total, invoice.currency ?? undefined), totalsValueX, y, fontBold, 12, COLOR_GREEN);
  y -= 30;

  // ─── Notes ─────────────────────────────────────────────────────

  if (invoice.notes) {
    if (y < 100) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 50;
    }

    drawText(page, 'Notes', MARGIN_LEFT, y, fontBold, 9, COLOR_GRAY);
    y -= 14;

    const noteLines = wrapText(invoice.notes, font, 9, CONTENT_WIDTH);
    for (const line of noteLines) {
      if (y < 60) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - 50;
      }
      drawText(page, line, MARGIN_LEFT, y, font, 9, COLOR_BLACK);
      y -= 12;
    }
  }

  // ─── Footer ────────────────────────────────────────────────────

  const footerPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  const footerText = 'Generated by Atlas';
  const footerWidth = font.widthOfTextAtSize(footerText, 8);
  footerPage.drawText(footerText, {
    x: (PAGE_WIDTH - footerWidth) / 2,
    y: 30,
    size: 8,
    font,
    color: COLOR_LIGHT_GRAY,
  });

  // 3. Serialize
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
