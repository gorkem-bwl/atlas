import { describe, it, expect } from 'vitest';
import { generateUblXml } from '../src/services/efatura/ubl-generator';

// UBL-TR 2.1 represents a natural person and a legal entity with structurally
// DIFFERENT customer-party blocks. Getting this wrong produces a document that
// is filed with the Turkish revenue administration, so the shape is pinned
// here rather than left to review.
//
// Rules exercised (GİB, UBL-TR Ortak Elemanlar §2.2.13 / §2.2.42 / §2.2.47):
//   - schemeID is TCKN for a person, VKN for a company
//   - cac:Person (FirstName + FamilyName) is MANDATORY for a person
//   - cac:PartyName carries a company title; omitted for a person
//   - cac:PartyTaxScheme carries the vergi dairesi, which a person has none of
//   - element order is fixed by the UBL sequence; Person comes last

const SETTINGS = {
  companyName: 'Satıcı A.Ş.',
  companyAddress: 'Levent Mah. 1. Cadde',
  companyTaxId: '1288331521',
  companyTaxOffice: 'Büyük Mükellefler',
  companyCity: 'İstanbul',
  companyCountry: 'Türkiye',
};

const INVOICE = {
  id: 'inv-1',
  invoiceNumber: 'ATL2026000000001',
  currency: 'TRY',
  issueDate: '2026-08-24',
  dueDate: '2026-09-23',
  amount: 1000,
  taxAmount: 200,
  eFaturaUuid: '11111111-2222-3333-4444-555555555555',
  eFaturaType: 'satis',
};

const LINE_ITEMS = [
  { id: 'li-1', description: 'Danışmanlık', quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 20 },
];

function xmlFor(client: Parameters<typeof generateUblXml>[2]) {
  return generateUblXml(INVOICE, LINE_ITEMS, client, SETTINGS);
}

/** The AccountingCustomerParty block only — the seller block is a company in both cases. */
function customerBlock(xml: string): string {
  const start = xml.indexOf('<cac:AccountingCustomerParty>');
  const end = xml.indexOf('</cac:AccountingCustomerParty>');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return xml.slice(start, end);
}

const COMPANY_CLIENT = {
  name: 'Alıcı Ltd. Şti.',
  address: 'Kadıköy Mah. 5. Sokak',
  country: 'Türkiye',
  taxId: '0730015566',
  taxOffice: 'Kadıköy',
  taxScheme: 'VKN' as const,
};

const INDIVIDUAL_CLIENT = {
  name: 'Ayşe Yılmaz',
  address: 'Bağdat Cad. No 12',
  country: 'Türkiye',
  taxId: '10000000146',
  taxOffice: null,
  taxScheme: 'TCKN' as const,
};

describe('company recipient (VKN)', () => {
  const block = () => customerBlock(xmlFor(COMPANY_CLIENT));

  it('identifies the party with schemeID="VKN"', () => {
    expect(block()).toContain('<cbc:ID schemeID="VKN">0730015566</cbc:ID>');
  });

  it('carries the company title in PartyName', () => {
    expect(block()).toContain('<cbc:Name>Alıcı Ltd. Şti.</cbc:Name>');
  });

  it('declares the vergi dairesi in PartyTaxScheme', () => {
    const b = block();
    expect(b).toContain('<cac:PartyTaxScheme>');
    expect(b).toContain('<cbc:Name>Kadıköy</cbc:Name>');
  });

  it('emits no cac:Person — that element is for natural persons', () => {
    expect(block()).not.toContain('<cac:Person>');
  });
});

describe('individual recipient (TCKN)', () => {
  const block = () => customerBlock(xmlFor(INDIVIDUAL_CLIENT));

  it('identifies the party with schemeID="TCKN"', () => {
    expect(block()).toContain('<cbc:ID schemeID="TCKN">10000000146</cbc:ID>');
    expect(block()).not.toContain('schemeID="VKN"');
  });

  it('emits cac:Person with both mandatory name parts', () => {
    const b = block();
    expect(b).toContain('<cac:Person>');
    expect(b).toContain('<cbc:FirstName>Ayşe</cbc:FirstName>');
    expect(b).toContain('<cbc:FamilyName>Yılmaz</cbc:FamilyName>');
  });

  it('omits PartyTaxScheme — an individual has no vergi dairesi', () => {
    // Emitting it empty is worse than omitting: TaxScheme/Name is then
    // required and would go out blank.
    expect(block()).not.toContain('<cac:PartyTaxScheme>');
  });

  it('omits PartyName — the person\'s name belongs in cac:Person', () => {
    expect(block()).not.toContain('<cac:PartyName>');
  });

  it('still emits the mandatory PostalAddress', () => {
    const b = block();
    expect(b).toContain('<cac:PostalAddress>');
    expect(b).toContain('<cbc:StreetName>Bağdat Cad. No 12</cbc:StreetName>');
  });

  it('places cac:Person after PostalAddress, per the UBL sequence', () => {
    // Emitting Person straight after PartyIdentification is a common
    // integration bug and fails schema validation.
    const b = block();
    expect(b.indexOf('<cac:Person>')).toBeGreaterThan(b.indexOf('<cac:PostalAddress>'));
    expect(b.indexOf('<cac:Person>')).toBeGreaterThan(b.indexOf('<cac:PartyIdentification>'));
  });
});

describe('name splitting for cac:Person', () => {
  function personOf(name: string) {
    const b = customerBlock(xmlFor({ ...INDIVIDUAL_CLIENT, name }));
    const first = b.match(/<cbc:FirstName>(.*?)<\/cbc:FirstName>/)?.[1];
    const family = b.match(/<cbc:FamilyName>(.*?)<\/cbc:FamilyName>/)?.[1];
    return { first, family };
  }

  it('treats the last token as the family name', () => {
    expect(personOf('Ayşe Yılmaz')).toEqual({ first: 'Ayşe', family: 'Yılmaz' });
  });

  it('keeps multiple given names together', () => {
    // Turkish convention puts the surname last, so everything before it is
    // given names rather than a middle-name slot.
    expect(personOf('Mehmet Ali Kaya')).toEqual({ first: 'Mehmet Ali', family: 'Kaya' });
  });

  it('never emits an empty FamilyName for a single-token name', () => {
    // Both elements are mandatory, so an empty one fails validation. Reusing
    // the token keeps the document valid and the name visible.
    const { first, family } = personOf('Madonna');
    expect(first).toBe('Madonna');
    expect(family).toBe('Madonna');
    expect(family).not.toBe('');
  });

  it('collapses irregular whitespace rather than splitting on it', () => {
    expect(personOf('  Ayşe   Yılmaz  ')).toEqual({ first: 'Ayşe', family: 'Yılmaz' });
  });
});

describe('XML safety', () => {
  it('escapes markup in a person name instead of breaking the document', () => {
    const b = customerBlock(xmlFor({ ...INDIVIDUAL_CLIENT, name: 'Ay<se & Co "X"' }));
    expect(b).not.toContain('Ay<se & Co "X"');
    expect(b).toContain('&amp;');
    expect(b).toContain('&lt;');
  });
});

describe('backwards compatibility', () => {
  it('defaults to VKN when no scheme is given', () => {
    // Existing company callers predate the taxScheme field and must keep
    // producing exactly the document they did before.
    const { taxScheme: _omitted, ...withoutScheme } = COMPANY_CLIENT;
    const b = customerBlock(xmlFor(withoutScheme));
    expect(b).toContain('<cbc:ID schemeID="VKN">0730015566</cbc:ID>');
    expect(b).toContain('<cac:PartyName>');
    expect(b).toContain('<cac:PartyTaxScheme>');
    expect(b).not.toContain('<cac:Person>');
  });
});

describe('seller party', () => {
  it('is always VKN, regardless of who is being billed', () => {
    // The seller is a registered business by definition; only the customer
    // party varies.
    const xml = xmlFor(INDIVIDUAL_CLIENT);
    const supplier = xml.slice(
      xml.indexOf('<cac:AccountingSupplierParty>'),
      xml.indexOf('</cac:AccountingSupplierParty>'),
    );
    expect(supplier).toContain('<cbc:ID schemeID="VKN">1288331521</cbc:ID>');
    expect(supplier).toContain('<cac:PartyTaxScheme>');
    expect(supplier).not.toContain('<cac:Person>');
  });
});
