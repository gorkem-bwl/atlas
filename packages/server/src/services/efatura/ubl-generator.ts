/**
 * UBL-TR 2.1 Invoice XML generator for Turkish e-Fatura system.
 * Pure template-string XML — no external dependencies.
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
  eFaturaUuid: string;
  eFaturaType?: string | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
}

function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(d: Date | string | null): string {
  if (!d) return new Date().toISOString().split('T')[0];
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];
}

function formatAmount(n: number): string {
  return n.toFixed(2);
}

export function generateUblXml(
  invoice: Invoice,
  lineItems: LineItem[],
  client: Client,
  companySettings: CompanySettings,
): string {
  const issueDate = formatDate(invoice.issueDate);
  const invoiceTypeCode = invoice.eFaturaType === 'iade' ? 'IADE' : 'SATIS';
  const currencyId = invoice.currency || 'TRY';

  // Aggregate tax totals by rate
  const taxByRate = new Map<number, { taxableAmount: number; taxAmount: number }>();
  for (const li of lineItems) {
    const rate = li.taxRate ?? 20;
    const existing = taxByRate.get(rate) || { taxableAmount: 0, taxAmount: 0 };
    existing.taxableAmount += li.amount;
    existing.taxAmount += li.amount * (rate / 100);
    taxByRate.set(rate, existing);
  }

  const lineExtensionAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const totalTaxAmount = [...taxByRate.values()].reduce((sum, t) => sum + t.taxAmount, 0);
  const taxInclusiveAmount = lineExtensionAmount + totalTaxAmount;

  // Build TaxSubtotal elements
  const taxSubtotals = [...taxByRate.entries()]
    .map(([rate, totals]) => `
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${currencyId}">${formatAmount(totals.taxableAmount)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${currencyId}">${formatAmount(totals.taxAmount)}</cbc:TaxAmount>
          <cbc:Percent>${formatAmount(rate)}</cbc:Percent>
          <cac:TaxCategory>
            <cac:TaxScheme>
              <cbc:Name>KDV</cbc:Name>
              <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>`)
    .join('');

  // Build InvoiceLine elements
  const invoiceLines = lineItems
    .map((li, idx) => {
      const lineNumber = idx + 1;
      const lineTaxAmount = li.amount * ((li.taxRate ?? 20) / 100);
      return `
    <cac:InvoiceLine>
      <cbc:ID>${lineNumber}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="C62">${formatAmount(li.quantity)}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${currencyId}">${formatAmount(li.amount)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${currencyId}">${formatAmount(lineTaxAmount)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${currencyId}">${formatAmount(li.amount)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${currencyId}">${formatAmount(lineTaxAmount)}</cbc:TaxAmount>
          <cbc:Percent>${formatAmount(li.taxRate ?? 20)}</cbc:Percent>
          <cac:TaxCategory>
            <cac:TaxScheme>
              <cbc:Name>KDV</cbc:Name>
              <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${escapeXml(li.description)}</cbc:Name>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${currencyId}">${formatAmount(li.unitPrice)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>TICARIFATURA</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${escapeXml(invoice.eFaturaUuid)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currencyId}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${lineItems.length}</cbc:LineCountNumeric>${invoice.notes ? `
  <cbc:Note>${escapeXml(invoice.notes)}</cbc:Note>` : ''}

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${escapeXml(companySettings.companyTaxId)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(companySettings.companyName)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(companySettings.companyAddress)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(companySettings.companyCity)}</cbc:CityName>
        <cac:Country>
          <cbc:Name>${escapeXml(companySettings.companyCountry || 'TR')}</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(companySettings.companyTaxId)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:Name>${escapeXml(companySettings.companyTaxOffice)}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${escapeXml(client.taxId)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(client.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(client.address)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(client.city)}</cbc:CityName>
        <cac:Country>
          <cbc:Name>${escapeXml(client.country || 'TR')}</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(client.taxId)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:Name>${escapeXml(client.taxOffice)}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currencyId}">${formatAmount(totalTaxAmount)}</cbc:TaxAmount>${taxSubtotals}
  </cac:TaxTotal>

  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currencyId}">${formatAmount(lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currencyId}">${formatAmount(lineExtensionAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currencyId}">${formatAmount(taxInclusiveAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currencyId}">${formatAmount(taxInclusiveAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${invoiceLines}
</Invoice>`;

  return xml;
}
