import { describe, it, expect } from 'vitest';
import { generateUblXml } from '../src/services/efatura/ubl-generator';

// GİB's InvoiceType marks both ext:UBLExtensions and cac:Signature mandatory.
// Neither was emitted, so every e-Fatura Atlas generated failed schema
// validation on line 7 — before reaching any of the invoice content. Verified
// against UBLTR_1.2.1/xsdrt/maindoc/UBL-Invoice-2.1.xsd with xmllint:
//
//   before this change   fails to validate ("Expected is ( ...UBLExtensions )")
//   after                validates
//
// Atlas does not sign these documents. It generates them for download and
// never transmits them, so the cryptographic signature is the filer's job.
// What it must do is emit a document that is *openable* by the tools that
// sign — which means the mandatory envelope has to be there.

const SETTINGS = {
  companyName: 'Satıcı A.Ş.',
  companyAddress: 'Levent Mah.',
  companyTaxId: '1288331521',
  companyTaxOffice: 'Büyük Mükellefler',
  companyCity: 'İstanbul',
  companyCountry: 'Türkiye',
};

const INVOICE = {
  id: 'inv-1',
  invoiceNumber: 'ATL2026000000001',
  currency: 'TRY',
  issueDate: '2026-08-28',
  dueDate: '2026-09-27',
  amount: 1000,
  taxAmount: 200,
  eFaturaUuid: '11111111-2222-3333-4444-555555555555',
  eFaturaType: 'satis',
};

const LINE_ITEMS = [
  { id: 'li-1', description: 'Danışmanlık', quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 20 },
];

const CLIENT = {
  name: 'Ayşe Yılmaz',
  address: 'Bağdat Cad. No 12',
  city: 'İstanbul',
  district: 'Kadıköy',
  postalCode: '34710',
  country: 'Türkiye',
  taxId: '10000000146',
  taxOffice: null,
  taxScheme: 'TCKN' as const,
};

const xml = () => generateUblXml(INVOICE, LINE_ITEMS, CLIENT, SETTINGS);

describe('ext:UBLExtensions', () => {
  it('is emitted, and is the first child of Invoice', () => {
    // The sequence puts it before UBLVersionID. Emitting it anywhere else —
    // or not at all — is a schema failure.
    const doc = xml();
    expect(doc).toContain('<ext:UBLExtensions>');
    expect(doc.indexOf('<ext:UBLExtensions>')).toBeLessThan(doc.indexOf('<cbc:UBLVersionID>'));
  });

  it('declares the ext namespace prefix it uses', () => {
    expect(xml()).toContain(
      'xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"',
    );
  });

  it('gives ExtensionContent exactly one foreign-namespace child', () => {
    // ExtensionContent is xsd:any namespace="##other" minOccurs=1, so an
    // empty element fails. The child must also be in a DIFFERENT namespace
    // than the UBL extension one.
    const doc = xml();
    expect(doc).toContain('<ext:ExtensionContent>');
    expect(doc).toContain('xmlns="urn:atlas:efatura:unsigned"');
  });

  it('names the placeholder so it cannot be mistaken for a signature', () => {
    // Someone reading this XML — or a tool consuming it — must be able to
    // tell at a glance that the document is unsigned.
    const doc = xml();
    expect(doc).toContain('UnsignedPlaceholder');
    expect(doc).toMatch(/unsigned/i);
    expect(doc).toMatch(/XADES-BES/);
  });
});

describe('cac:Signature', () => {
  it('is emitted between LineCountNumeric and AccountingSupplierParty', () => {
    // Its position in the sequence is fixed; the optional reference elements
    // that would sit between them are not emitted.
    const doc = xml();
    const sig = doc.indexOf('<cac:Signature>');
    expect(sig).toBeGreaterThan(doc.indexOf('<cbc:LineCountNumeric>'));
    expect(sig).toBeLessThan(doc.indexOf('<cac:AccountingSupplierParty>'));
  });

  it('carries all three mandatory children of SignatureType', () => {
    const doc = xml();
    const sig = doc.slice(doc.indexOf('<cac:Signature>'), doc.indexOf('</cac:Signature>'));
    expect(sig).toContain('<cbc:ID schemeID="VKN">');
    expect(sig).toContain('<cac:SignatoryParty>');
    expect(sig).toContain('<cac:DigitalSignatureAttachment>');
  });

  it('identifies the seller as signatory, not the buyer', () => {
    // The signatory is whoever files the invoice — the tenant. Using the
    // buyer's identifier here would misattribute the document.
    const doc = xml();
    const sig = doc.slice(doc.indexOf('<cac:Signature>'), doc.indexOf('</cac:Signature>'));
    expect(sig).toContain('1288331521'); // seller VKN from settings
    expect(sig).not.toContain('10000000146'); // buyer TCKN must not appear
  });

  it('gives SignatoryParty the PostalAddress its type requires', () => {
    // PartyType mandates PartyIdentification AND PostalAddress, so a bare
    // identifier is not enough.
    const doc = xml();
    const sig = doc.slice(doc.indexOf('<cac:Signature>'), doc.indexOf('</cac:Signature>'));
    expect(sig).toContain('<cac:PostalAddress>');
    expect(sig).toContain('<cbc:CityName>İstanbul</cbc:CityName>');
  });

  it('reuses the shared address builder, so mandatory children are present', () => {
    const doc = xml();
    const sig = doc.slice(doc.indexOf('<cac:Signature>'), doc.indexOf('</cac:Signature>'));
    expect(sig).toContain('<cbc:CitySubdivisionName>');
    expect(sig).toContain('<cac:Country>');
  });
});

describe('document remains well-formed with sparse data', () => {
  it('emits both mandatory elements even when the client has nothing set', () => {
    const bare = {
      name: 'Boş Kayıt',
      address: null,
      city: null,
      district: null,
      postalCode: null,
      country: null,
      taxId: '10000000146',
      taxOffice: null,
      taxScheme: 'TCKN' as const,
    };
    const doc = generateUblXml(INVOICE, LINE_ITEMS, bare, SETTINGS);
    expect(doc).toContain('<ext:UBLExtensions>');
    expect(doc).toContain('<cac:Signature>');
  });

  it('still emits Signature when seller settings are empty', () => {
    // A tenant that has not filled in its e-Fatura settings would otherwise
    // produce a document missing a mandatory element.
    const doc = generateUblXml(INVOICE, LINE_ITEMS, CLIENT, {
      companyName: null,
      companyAddress: null,
      companyTaxId: null,
      companyTaxOffice: null,
      companyCity: null,
      companyCountry: null,
    });
    expect(doc).toContain('<cac:Signature>');
    expect(doc).toContain('<cac:DigitalSignatureAttachment>');
  });
});
