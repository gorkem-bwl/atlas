import { describe, it, expect, vi } from 'vitest';

// The service module pulls in the db client and the workflow engine at import
// time; neither is needed to exercise the pure normalizer below.
vi.mock('../src/config/database', () => ({ db: {}, pool: {} }));
vi.mock('../src/apps/crm/services/workflow.service', () => ({ executeWorkflows: vi.fn() }));
vi.mock('../src/apps/crm/services/contact-message-backfill.service', () => ({
  backfillContactMessages: vi.fn(),
}));

const { normalizeAddressField } = await import('../src/apps/crm/services/contact.service');

describe('normalizeAddressField', () => {
  it('distinguishes "leave alone" from "clear"', () => {
    // undefined must survive so updateContact's `!== undefined` guard can tell
    // an absent field from an explicit clear.
    expect(normalizeAddressField(undefined, 'country')).toBeUndefined();
    expect(normalizeAddressField(null, 'country')).toBeNull();
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeAddressField('  Berlin  ', 'state')).toBe('Berlin');
  });

  it('treats a whitespace-only value as cleared', () => {
    expect(normalizeAddressField('   ', 'state')).toBeNull();
  });

  it('caps postalCode at the varchar(20) column width', () => {
    // A mis-mapped CSV column (e.g. a full address landing in "postal code")
    // would otherwise be rejected by Postgres and surface as an opaque 500.
    const overlong = '1'.repeat(50);
    const result = normalizeAddressField(overlong, 'postalCode');
    expect(result).toHaveLength(20);
    expect(result).toBe('1'.repeat(20));
  });

  it('caps state and country at the varchar(100) column width', () => {
    const overlong = 'x'.repeat(250);
    expect(normalizeAddressField(overlong, 'state')).toHaveLength(100);
    expect(normalizeAddressField(overlong, 'country')).toHaveLength(100);
  });

  it('leaves values within the column width untouched', () => {
    expect(normalizeAddressField('94105', 'postalCode')).toBe('94105');
    expect(normalizeAddressField('United Kingdom', 'country')).toBe('United Kingdom');
  });

  it('trims before measuring, so padding alone does not cause truncation', () => {
    const padded = `  ${'9'.repeat(20)}  `;
    expect(normalizeAddressField(padded, 'postalCode')).toBe('9'.repeat(20));
  });
});
