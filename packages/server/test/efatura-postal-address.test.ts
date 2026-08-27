import { describe, it, expect } from 'vitest';
import { generateUblXml } from '../src/services/efatura/ubl-generator';

// GİB's UBL-TR package tightens the stock OASIS schema. In
// UBLTR_1.2.1/xsdrt/common/UBL-CommonAggregateComponents-2.1.xsd, AddressType
// leaves CitySubdivisionName, CityName and Country at the default
// minOccurs=1, where plain UBL 2.1 marks them optional.
//
// The consequences are counter-intuitive and were verified by validating
// generated output against that schema with xmllint:
//
//   <cbc:CityName>İstanbul</cbc:CityName>   validates
//   <cbc:CityName></cbc:CityName>           validates   <- correct when unknown
//   (element omitted)                       FAILS       <- hard XSD rejection
//   CityName before CitySubdivisionName     FAILS       <- sequence is binding
//
// So an unknown value must still emit the element, empty. Dropping it is the
// one thing that cannot work. These tests exist because the natural instinct
// — "don't emit empty elements" — is exactly backwards here.

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
  issueDate: '2026-08-27',
  dueDate: '2026-09-26',
  amount: 1000,
  taxAmount: 200,
  eFaturaUuid: '11111111-2222-3333-4444-555555555555',
  eFaturaType: 'satis',
};

const LINE_ITEMS = [
  { id: 'li-1', description: 'Danışmanlık', quantity: 1, unitPrice: 1000, amount: 1000, taxRate: 20 },
];

const FULL_CLIENT = {
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

function buyerAddress(client: Parameters<typeof generateUblXml>[2]): string {
  const xml = generateUblXml(INVOICE, LINE_ITEMS, client, SETTINGS);
  const scope = xml.slice(
    xml.indexOf('<cac:AccountingCustomerParty>'),
    xml.indexOf('</cac:AccountingCustomerParty>'),
  );
  return scope.slice(
    scope.indexOf('<cac:PostalAddress>'),
    scope.indexOf('</cac:PostalAddress>'),
  );
}

describe('PostalAddress mandatory elements', () => {
  it('always emits CitySubdivisionName, CityName and Country', () => {
    const a = buyerAddress(FULL_CLIENT);
    expect(a).toContain('<cbc:CitySubdivisionName>');
    expect(a).toContain('<cbc:CityName>');
    expect(a).toContain('<cac:Country>');
  });

  it('emits them EMPTY rather than dropping them when unknown', () => {
    // The whole point. Omitting is a hard XSD failure; empty validates.
    const a = buyerAddress({ ...FULL_CLIENT, city: null, district: null });
    expect(a).toContain('<cbc:CitySubdivisionName></cbc:CitySubdivisionName>');
    expect(a).toContain('<cbc:CityName></cbc:CityName>');
  });

  it('still emits Country when unset, defaulting to TR', () => {
    const a = buyerAddress({ ...FULL_CLIENT, country: null });
    expect(a).toContain('<cbc:Name>TR</cbc:Name>');
  });
});

describe('PostalAddress element order', () => {
  it('places CitySubdivisionName before CityName — ilçe before il', () => {
    // The reverse of how they are usually spoken, and the sequence is
    // binding: swapping them fails schema validation outright.
    const a = buyerAddress(FULL_CLIENT);
    expect(a.indexOf('<cbc:CitySubdivisionName>')).toBeLessThan(a.indexOf('<cbc:CityName>'));
  });

  it('follows the full AddressType sequence', () => {
    const a = buyerAddress(FULL_CLIENT);
    const order = [
      '<cbc:StreetName>',
      '<cbc:CitySubdivisionName>',
      '<cbc:CityName>',
      '<cbc:PostalZone>',
      '<cac:Country>',
    ].map((tag) => a.indexOf(tag));

    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
  });
});

describe('PostalAddress optional elements', () => {
  it('emits StreetName and PostalZone when populated', () => {
    const a = buyerAddress(FULL_CLIENT);
    expect(a).toContain('<cbc:StreetName>Bağdat Cad. No 12</cbc:StreetName>');
    expect(a).toContain('<cbc:PostalZone>34710</cbc:PostalZone>');
  });

  it('omits them entirely when absent, rather than emitting empty', () => {
    // Opposite treatment to the mandatory three: these are minOccurs=0, so
    // leaving them out is both valid and tidier than an empty element.
    const a = buyerAddress({ ...FULL_CLIENT, address: null, postalCode: null });
    expect(a).not.toContain('<cbc:StreetName>');
    expect(a).not.toContain('<cbc:PostalZone>');
    // ...while the mandatory ones survive.
    expect(a).toContain('<cbc:CityName>');
  });
});

describe('seller PostalAddress', () => {
  it('gets the same treatment as the buyer', () => {
    // Both parties share one builder, so a fix on one side cannot drift
    // from the other.
    const xml = generateUblXml(INVOICE, LINE_ITEMS, FULL_CLIENT, SETTINGS);
    const supplier = xml.slice(
      xml.indexOf('<cac:AccountingSupplierParty>'),
      xml.indexOf('</cac:AccountingSupplierParty>'),
    );
    expect(supplier).toContain('<cbc:CitySubdivisionName>');
    expect(supplier).toContain('<cbc:CityName>İstanbul</cbc:CityName>');
  });
});

describe('city reaches the document', () => {
  it('renders the recipient city that used to be blank on every invoice', () => {
    // Before #32 neither CRM table stored a city, so this element was empty
    // on every e-Fatura Atlas produced.
    expect(buyerAddress(FULL_CLIENT)).toContain('<cbc:CityName>İstanbul</cbc:CityName>');
  });

  it('escapes markup in address fields', () => {
    const a = buyerAddress({ ...FULL_CLIENT, city: 'A<b>&"x"' });
    expect(a).toContain('&lt;');
    expect(a).toContain('&amp;');
    expect(a).not.toContain('<b>');
  });
});
