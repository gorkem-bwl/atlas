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
  /** İlçe. Mandatory in the GİB schema alongside city — see buildPostalAddress. */
  district?: string | null;
  country?: string | null;
  taxId?: string | null;
  taxOffice?: string | null;
  /**
   * Which identifier `taxId` is. Defaults to 'VKN' when absent so existing
   * company callers are unaffected.
   *
   * This is not cosmetic: UBL-TR requires a structurally different customer
   * party for a natural person (see buildCustomerParty).
   */
  taxScheme?: 'VKN' | 'TCKN';
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

/**
 * Split a display name into the FirstName / FamilyName pair that UBL-TR
 * requires for a natural person. Both elements are mandatory and must appear
 * exactly once, so neither may be emitted empty.
 *
 * Atlas stores one `name` field, so this splits on the last space: everything
 * before it is given names, the final token is the family name. That matches
 * Turkish convention, where the surname comes last.
 *
 * A single-token name has no surname to extract. Rather than emit an empty
 * FamilyName (which the schema rejects) the whole token is used for both —
 * the document stays valid and the name is not silently lost. Callers that
 * care should collect the two parts separately.
 */
function splitPersonName(name: string): { firstName: string; familyName: string } {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  const lastSpace = trimmed.lastIndexOf(' ');

  if (lastSpace === -1) {
    return { firstName: trimmed, familyName: trimmed };
  }
  return {
    firstName: trimmed.slice(0, lastSpace),
    familyName: trimmed.slice(lastSpace + 1),
  };
}

/**
 * <ext:UBLExtensions> — mandatory in GİB's InvoiceType, and the slot a
 * XAdES-BES signature occupies on a submitted invoice.
 *
 * Atlas does not sign. It generates this XML for download
 * (GET /invoices/:id/efatura/xml) and never transmits it: eFaturaStatus only
 * ever reaches 'generated', and the Paraşüt integration pushes structured
 * JSON over its own API rather than this document. Signing belongs to
 * whoever files the invoice — the tenant's özel entegratör or their own
 * portal upload — and requires a qualified certificate (mali mühür / e-imza)
 * that Atlas does not hold.
 *
 * The element cannot simply be dropped. ExtensionContent requires exactly one
 * child from another namespace, and GİB's package raises UBLExtensions to
 * minOccurs=1 (stock OASIS UBL leaves it optional), so omitting it fails
 * validation outright and the document cannot even be opened by the tools
 * meant to sign it.
 *
 * So this emits a placeholder that is deliberately conspicuous. It is not a
 * signature and must not be mistaken for one: the element name says so, and
 * the note repeats it in the document itself. A signing step replaces this
 * whole block.
 */
function buildUblExtensions(): string {
  return `  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <UnsignedPlaceholder xmlns="urn:atlas:efatura:unsigned" Id="Signature">
          <Note>This document is unsigned. A XADES-BES signature must be applied by the filer before submission to GIB.</Note>
        </UnsignedPlaceholder>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>`;
}

/**
 * <cac:Signature> — mandatory in InvoiceType, and distinct from the
 * cryptographic signature itself (which lives in UBLExtensions above).
 *
 * This element declares WHO signs: an ID, the signatory party, and a
 * reference to where the signature is attached. All three children are
 * mandatory in SignatureType, and SignatoryParty in turn requires
 * PartyIdentification and PostalAddress — all of which describe the seller,
 * so they come from the tenant's own e-Fatura settings rather than needing a
 * certificate.
 */
function buildSignature(companySettings: CompanySettings): string {
  return `  <cac:Signature>
    <cbc:ID schemeID="VKN">${escapeXml(companySettings.companyTaxId)}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${escapeXml(companySettings.companyTaxId)}</cbc:ID>
      </cac:PartyIdentification>
${buildPostalAddress({
    address: companySettings.companyAddress,
    city: companySettings.companyCity,
    country: companySettings.companyCountry,
  })}
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <!-- Points at the Id on the UBLExtensions placeholder above, which is
             the anchor a real signature replaces. DigitalSignatureAttachment
             is mandatory in SignatureType, so this cannot be dropped just
             because the document is unsigned. -->
        <cbc:URI>#Signature</cbc:URI>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>`;
}

/**
 * <cac:PostalAddress> for either party.
 *
 * GİB's UBL-TR package tightens the stock OASIS schema: in
 * UBLTR_1.2.1/xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd, AddressType
 * leaves CitySubdivisionName, CityName and Country at the default minOccurs=1,
 * where plain UBL 2.1 marks them optional. All three must therefore be PRESENT.
 *
 * Present, not populated: the element types carry no minLength facet, so an
 * empty element validates while a missing one is a hard XSD failure. When a
 * value is unknown the correct output is an empty element — never omission.
 * (Note the reverse of what one might assume; the "must not be empty" rule
 * that circulates applies to e-İrsaliye DeliveryAddress, not to invoices.)
 *
 * Order is an xsd:sequence and is binding. CitySubdivisionName precedes
 * CityName — ilçe before il, the reverse of how they are usually spoken.
 * Optional elements are emitted only when they have a value, which keeps the
 * document clean without risking the mandatory three.
 */
function buildPostalAddress(party: {
  address?: string | null;
  district?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string {
  // Optional: emit only when populated.
  const streetName = party.address
    ? `
        <cbc:StreetName>${escapeXml(party.address)}</cbc:StreetName>`
    : '';
  const postalZone = party.postalCode
    ? `
        <cbc:PostalZone>${escapeXml(party.postalCode)}</cbc:PostalZone>`
    : '';

  // Mandatory: always present, even when we have no value to put in them.
  return `      <cac:PostalAddress>${streetName}
        <cbc:CitySubdivisionName>${escapeXml(party.district)}</cbc:CitySubdivisionName>
        <cbc:CityName>${escapeXml(party.city)}</cbc:CityName>${postalZone}
        <cac:Country>
          <cbc:Name>${escapeXml(party.country || 'TR')}</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>`;
}

/**
 * The <cac:Party> body for the invoice recipient.
 *
 * A company and a natural person are structurally different documents here,
 * per UBL-TR 2.1 (Ortak Elemanlar §2.2.13 / §2.2.42):
 *
 *   - schemeID is TCKN for a person, VKN for a company.
 *   - PartyName carries a *company* title. For a person the name belongs in
 *     cac:Person, and GİB's own individual example omits PartyName entirely.
 *   - cac:Person is MANDATORY when the party is a natural person, with
 *     FirstName and FamilyName both required.
 *   - PartyTaxScheme is filled in only when a VKN was supplied — it carries
 *     the vergi dairesi, which an individual does not have. Emitting it empty
 *     is worse than omitting it, because TaxScheme/Name is then required.
 *
 * Element order is fixed by the UBL sequence and is NOT free: PartyName
 * precedes PostalAddress, which precedes PartyTaxScheme, and cac:Person comes
 * last. Emitting Person right after PartyIdentification — a common mistake —
 * fails schema validation.
 */
function buildCustomerParty(client: Client): string {
  const scheme = client.taxScheme ?? 'VKN';
  const isIndividual = scheme === 'TCKN';

  const partyName = isIndividual
    ? ''
    : `
      <cac:PartyName>
        <cbc:Name>${escapeXml(client.name)}</cbc:Name>
      </cac:PartyName>`;

  // Only a VKN party has a vergi dairesi to declare.
  const partyTaxScheme = isIndividual
    ? ''
    : `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(client.taxId)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:Name>${escapeXml(client.taxOffice)}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>`;

  let person = '';
  if (isIndividual) {
    const { firstName, familyName } = splitPersonName(client.name);
    person = `
      <cac:Person>
        <cbc:FirstName>${escapeXml(firstName)}</cbc:FirstName>
        <cbc:FamilyName>${escapeXml(familyName)}</cbc:FamilyName>
      </cac:Person>`;
  }

  return `    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${scheme}">${escapeXml(client.taxId)}</cbc:ID>
      </cac:PartyIdentification>${partyName}
${buildPostalAddress(client)}${partyTaxScheme}${person}
    </cac:Party>`;
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
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2 UBL-Invoice-2.1.xsd">
${buildUblExtensions()}
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>TICARIFATURA</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${escapeXml(invoice.eFaturaUuid)}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${invoiceTypeCode}</cbc:InvoiceTypeCode>${invoice.notes ? `
  <cbc:Note>${escapeXml(invoice.notes)}</cbc:Note>` : ''}
  <cbc:DocumentCurrencyCode>${currencyId}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${lineItems.length}</cbc:LineCountNumeric>

${buildSignature(companySettings)}

  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${escapeXml(companySettings.companyTaxId)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${escapeXml(companySettings.companyName)}</cbc:Name>
      </cac:PartyName>
${buildPostalAddress({
        address: companySettings.companyAddress,
        city: companySettings.companyCity,
        country: companySettings.companyCountry,
      })}
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(companySettings.companyTaxId)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:Name>${escapeXml(companySettings.companyTaxOffice)}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <cac:AccountingCustomerParty>
${buildCustomerParty(client)}
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
