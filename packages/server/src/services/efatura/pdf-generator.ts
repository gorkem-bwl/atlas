/**
 * HTML invoice generator for Turkish e-Fatura preview / PDF download.
 * Self-contained HTML with inline CSS — no external dependencies.
 */

interface CompanySettings {
  companyName?: string | null;
  companyAddress?: string | null;
  companyTaxId?: string | null;
  companyTaxOffice?: string | null;
  companyCity?: string | null;
  companyCountry?: string | null;
}

interface Client {
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  taxId?: string | null;
  taxOffice?: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  currency: string;
  issueDate: Date | string | null;
  dueDate?: Date | string | null;
  amount: number;
  taxAmount: number;
  notes?: string | null;
  eFaturaUuid?: string | null;
  eFaturaType?: string | null;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
}

function esc(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d: Date | string | null): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function fmt(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateInvoiceHtml(
  invoice: Invoice,
  lineItems: LineItem[],
  client: Client,
  companySettings: CompanySettings,
): string {
  // Aggregate tax by rate
  const taxByRate = new Map<number, { taxableAmount: number; taxAmount: number }>();
  for (const li of lineItems) {
    const rate = li.taxRate ?? 20;
    const existing = taxByRate.get(rate) || { taxableAmount: 0, taxAmount: 0 };
    existing.taxableAmount += li.amount;
    existing.taxAmount += li.amount * (rate / 100);
    taxByRate.set(rate, existing);
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const totalTax = [...taxByRate.values()].reduce((sum, t) => sum + t.taxAmount, 0);
  const grandTotal = subtotal + totalTax;
  const currencySymbol = invoice.currency === 'TRY' ? '₺' : invoice.currency;

  const lineItemRows = lineItems
    .map((li, idx) => {
      const lineTax = li.amount * ((li.taxRate ?? 20) / 100);
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${idx + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${esc(li.description)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(li.quantity)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(li.unitPrice)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">%${li.taxRate ?? 20}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmt(lineTax)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:500;">${fmt(li.amount + lineTax)}</td>
        </tr>`;
    })
    .join('');

  const taxSummaryRows = [...taxByRate.entries()]
    .map(([rate, totals]) => `
        <tr>
          <td style="padding:6px 12px;text-align:right;">KDV %${rate}</td>
          <td style="padding:6px 12px;text-align:right;">${fmt(totals.taxableAmount)}</td>
          <td style="padding:6px 12px;text-align:right;font-weight:600;">${fmt(totals.taxAmount)}</td>
        </tr>`)
    .join('');

  const faturaType = invoice.eFaturaType === 'iade' ? 'İade Faturası' : 'Satış Faturası';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>e-Fatura ${esc(invoice.invoiceNumber)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#1f2937; background:#f9fafb; }
    .invoice { max-width:800px; margin:24px auto; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:40px; }
    .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; padding-bottom:24px; border-bottom:2px solid #e5e7eb; }
    .company-name { font-size:20px; font-weight:700; color:#111827; margin-bottom:4px; }
    .meta-label { font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; }
    .meta-value { font-size:14px; color:#1f2937; margin-bottom:8px; }
    .parties { display:flex; gap:40px; margin-bottom:32px; }
    .party { flex:1; }
    .party-title { font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px; }
    .party-name { font-size:16px; font-weight:600; color:#111827; margin-bottom:4px; }
    .party-detail { font-size:13px; color:#4b5563; line-height:1.5; }
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    th { padding:10px 12px; background:#f3f4f6; border-bottom:2px solid #d1d5db; font-size:12px; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:0.5px; }
    .totals { display:flex; justify-content:flex-end; margin-bottom:24px; }
    .totals-table { width:320px; }
    .totals-table td { padding:6px 12px; font-size:14px; }
    .totals-table .grand-total td { font-size:18px; font-weight:700; border-top:2px solid #111827; padding-top:12px; }
    .tax-summary { margin-bottom:24px; }
    .tax-summary-title { font-size:13px; font-weight:600; color:#374151; margin-bottom:8px; }
    .notes { margin-top:24px; padding:16px; background:#f9fafb; border-radius:6px; border:1px solid #e5e7eb; }
    .notes-title { font-size:12px; font-weight:600; color:#6b7280; text-transform:uppercase; margin-bottom:4px; }
    .notes-text { font-size:13px; color:#4b5563; line-height:1.5; }
    .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; text-align:center; font-size:11px; color:#9ca3af; }
    @media print { body { background:#fff; } .invoice { border:none; margin:0; padding:20px; box-shadow:none; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="company-name">${esc(companySettings.companyName)}</div>
        <div class="party-detail">${esc(companySettings.companyAddress)}</div>
        <div class="party-detail">${esc(companySettings.companyCity)}${companySettings.companyCountry ? ', ' + esc(companySettings.companyCountry) : ''}</div>
        <div class="party-detail" style="margin-top:4px;">VKN: ${esc(companySettings.companyTaxId)}</div>
        <div class="party-detail">Vergi Dairesi: ${esc(companySettings.companyTaxOffice)}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:24px;font-weight:700;color:#111827;margin-bottom:8px;">e-FATURA</div>
        <div class="meta-label">Fatura No</div>
        <div class="meta-value" style="font-weight:600;">${esc(invoice.invoiceNumber)}</div>
        <div class="meta-label">Düzenleme Tarihi</div>
        <div class="meta-value">${formatDate(invoice.issueDate)}</div>
        ${invoice.dueDate ? `<div class="meta-label">Vade Tarihi</div><div class="meta-value">${formatDate(invoice.dueDate)}</div>` : ''}
        <div class="meta-label">Fatura Tipi</div>
        <div class="meta-value">${faturaType}</div>
        ${invoice.eFaturaUuid ? `<div class="meta-label">ETTN</div><div class="meta-value" style="font-size:11px;word-break:break-all;">${esc(invoice.eFaturaUuid)}</div>` : ''}
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-title">Satıcı</div>
        <div class="party-name">${esc(companySettings.companyName)}</div>
        <div class="party-detail">${esc(companySettings.companyAddress)}</div>
        <div class="party-detail">${esc(companySettings.companyCity)}</div>
        <div class="party-detail">VKN: ${esc(companySettings.companyTaxId)}</div>
        <div class="party-detail">Vergi Dairesi: ${esc(companySettings.companyTaxOffice)}</div>
      </div>
      <div class="party">
        <div class="party-title">Alıcı</div>
        <div class="party-name">${esc(client.name)}</div>
        <div class="party-detail">${esc(client.address)}</div>
        <div class="party-detail">${esc(client.city)}</div>
        ${client.taxId ? `<div class="party-detail">VKN: ${esc(client.taxId)}</div>` : ''}
        ${client.taxOffice ? `<div class="party-detail">Vergi Dairesi: ${esc(client.taxOffice)}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:center;width:40px;">#</th>
          <th style="text-align:left;">Açıklama</th>
          <th style="text-align:right;width:80px;">Miktar</th>
          <th style="text-align:right;width:100px;">Birim Fiyat</th>
          <th style="text-align:center;width:70px;">KDV</th>
          <th style="text-align:right;width:100px;">KDV Tutarı</th>
          <th style="text-align:right;width:110px;">Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemRows}
      </tbody>
    </table>

    <div class="tax-summary">
      <div class="tax-summary-title">KDV Özeti</div>
      <table style="width:400px;margin-left:auto;">
        <thead>
          <tr>
            <th style="text-align:right;">KDV Oranı</th>
            <th style="text-align:right;">Matrah</th>
            <th style="text-align:right;">KDV Tutarı</th>
          </tr>
        </thead>
        <tbody>
          ${taxSummaryRows}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td style="text-align:right;color:#6b7280;">Ara Toplam</td>
          <td style="text-align:right;">${currencySymbol} ${fmt(subtotal)}</td>
        </tr>
        <tr>
          <td style="text-align:right;color:#6b7280;">KDV Toplam</td>
          <td style="text-align:right;">${currencySymbol} ${fmt(totalTax)}</td>
        </tr>
        <tr class="grand-total">
          <td style="text-align:right;">Genel Toplam</td>
          <td style="text-align:right;">${currencySymbol} ${fmt(grandTotal)}</td>
        </tr>
      </table>
    </div>

    ${invoice.notes ? `
    <div class="notes">
      <div class="notes-title">Notlar</div>
      <div class="notes-text">${esc(invoice.notes)}</div>
    </div>` : ''}

    <div class="footer">
      Bu belge Atlas tarafından oluşturulmuştur. &bull; e-Fatura ETTN: ${esc(invoice.eFaturaUuid)}
    </div>
  </div>
</body>
</html>`;
}
