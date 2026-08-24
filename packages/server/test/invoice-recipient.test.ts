import { describe, it, expect, vi } from 'vitest';

// The party service pulls in the db client at import time; hasRecipient is
// pure and needs none of it.
vi.mock('../src/config/database', () => ({ db: {}, pool: {} }));

const { hasRecipient } = await import('../src/apps/invoices/services/invoice-party.service');

// An invoice must be addressed to a company OR an individual contact. The
// database enforces this with the invoices_recipient_present CHECK; this
// helper mirrors the rule in the API layer so a violation comes back as a
// 400 with a usable message rather than a 500 from the driver.
describe('hasRecipient', () => {
  describe('on create (no stored row)', () => {
    it('accepts a company alone', () => {
      expect(hasRecipient({ companyId: 'co1' })).toBe(true);
    });

    it('accepts a contact alone — the B2C case this whole change exists for', () => {
      expect(hasRecipient({ contactId: 'ct1' })).toBe(true);
    });

    it('accepts both', () => {
      expect(hasRecipient({ companyId: 'co1', contactId: 'ct1' })).toBe(true);
    });

    it('rejects neither', () => {
      expect(hasRecipient({})).toBe(false);
      expect(hasRecipient({ companyId: null, contactId: null })).toBe(false);
    });

    it('treats an empty string as absent', () => {
      // The builder sends '' for an unselected Select; that is not a recipient.
      expect(hasRecipient({ companyId: '', contactId: '' })).toBe(false);
    });
  });

  describe('on update (against the stored row)', () => {
    it('allows clearing the company while a contact remains', () => {
      expect(hasRecipient({ companyId: null }, { companyId: 'co1', contactId: 'ct1' })).toBe(true);
    });

    it('allows clearing the contact while a company remains', () => {
      expect(hasRecipient({ contactId: null }, { companyId: 'co1', contactId: 'ct1' })).toBe(true);
    });

    it('rejects clearing the only recipient', () => {
      // The invoice would be left addressed to nobody.
      expect(hasRecipient({ companyId: null }, { companyId: 'co1', contactId: null })).toBe(false);
      expect(hasRecipient({ contactId: null }, { companyId: null, contactId: 'ct1' })).toBe(false);
    });

    it('rejects clearing both at once even though each alone would be fine', () => {
      expect(
        hasRecipient({ companyId: null, contactId: null }, { companyId: 'co1', contactId: 'ct1' }),
      ).toBe(false);
    });

    it('ignores untouched fields rather than treating them as cleared', () => {
      // A patch that only changes the due date must not read as "no recipient".
      // `undefined` means absent from the patch; only an explicit null clears.
      expect(hasRecipient({}, { companyId: 'co1', contactId: null })).toBe(true);
      expect(hasRecipient({}, { companyId: null, contactId: 'ct1' })).toBe(true);
    });

    it('allows swapping one recipient for the other in a single patch', () => {
      expect(
        hasRecipient({ companyId: null, contactId: 'ct1' }, { companyId: 'co1', contactId: null }),
      ).toBe(true);
    });
  });
});
