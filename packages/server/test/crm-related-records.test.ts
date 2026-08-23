import { describe, it, expect, vi, beforeEach } from 'vitest';

// The controllers under test only need the CRM lookup and the related-records
// service; both are mocked so these assertions stay about permission wiring.
vi.mock('../src/apps/crm/services/contact.service', () => ({
  getContact: vi.fn(),
}));

vi.mock('../src/apps/crm/services/company.service', () => ({
  getCompany: vi.fn(),
}));

vi.mock('../src/apps/crm/services/related-records.service', () => ({
  getRelatedRecords: vi.fn(),
}));

vi.mock('../src/services/event.service', () => ({
  emitAppEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import * as contactService from '../src/apps/crm/services/contact.service';
import * as companyService from '../src/apps/crm/services/company.service';
import * as relatedService from '../src/apps/crm/services/related-records.service';
import { getContactRelated } from '../src/apps/crm/controllers/contact.controller';
import { getCompanyRelated } from '../src/apps/crm/controllers/company.controller';
import { makeReqWithPerm, makeRes } from './helpers/rbac-harness';

const EMPTY = {
  invoices: [],
  projects: [],
  totals: { invoices: 0, projects: 0 },
  visibility: { invoices: true, projects: true },
};

function req(role: 'admin' | 'editor' | 'viewer', recordAccess: 'all' | 'own' = 'all') {
  return makeReqWithPerm('crm', role, recordAccess, { params: { id: 'r1' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(relatedService.getRelatedRecords).mockResolvedValue(EMPTY as any);
});

describe('GET /crm/contacts/:id/related', () => {
  it('returns related records when the contact is visible', async () => {
    vi.mocked(contactService.getContact).mockResolvedValue({ id: 'r1' } as any);
    const res = makeRes();

    await getContactRelated(req('viewer'), res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: EMPTY });
  });

  it('404s when the contact is not visible to this caller', async () => {
    // getContact applies the caller's recordAccess, so a contact owned by
    // someone else comes back null for an `own`-scoped user. Reporting the
    // related records anyway would leak that the record exists.
    vi.mocked(contactService.getContact).mockResolvedValue(null as any);
    const res = makeRes();

    await getContactRelated(req('editor', 'own'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(relatedService.getRelatedRecords).not.toHaveBeenCalled();
  });

  it('passes the caller identity and tenant through to the service', async () => {
    vi.mocked(contactService.getContact).mockResolvedValue({ id: 'r1' } as any);

    await getContactRelated(req('admin'), makeRes());

    expect(relatedService.getRelatedRecords).toHaveBeenCalledWith(
      't1',
      'u-self',
      { contactId: 'r1' },
      false,
    );
  });

  it('forwards the super-admin flag', async () => {
    vi.mocked(contactService.getContact).mockResolvedValue({ id: 'r1' } as any);
    const r = makeReqWithPerm('crm', 'admin', 'all', {
      params: { id: 'r1' },
      auth: { userId: 'u-self', email: 'self@test.com', tenantId: 't1', isSuperAdmin: true },
    });

    await getContactRelated(r, makeRes());

    expect(relatedService.getRelatedRecords).toHaveBeenCalledWith(
      't1',
      'u-self',
      { contactId: 'r1' },
      true,
    );
  });

  it('500s without leaking the underlying error', async () => {
    vi.mocked(contactService.getContact).mockRejectedValue(new Error('db exploded'));
    const res = makeRes();

    await getContactRelated(req('admin'), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Failed to load related records',
    });
  });
});

describe('GET /crm/companies/:id/related', () => {
  it('returns related records when the company is visible', async () => {
    vi.mocked(companyService.getCompany).mockResolvedValue({ id: 'r1' } as any);
    const res = makeRes();

    await getCompanyRelated(req('viewer'), res);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: EMPTY });
  });

  it('404s when the company is not visible to this caller', async () => {
    vi.mocked(companyService.getCompany).mockResolvedValue(null as any);
    const res = makeRes();

    await getCompanyRelated(req('editor', 'own'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(relatedService.getRelatedRecords).not.toHaveBeenCalled();
  });

  it('scopes the lookup by companyId', async () => {
    vi.mocked(companyService.getCompany).mockResolvedValue({ id: 'r1' } as any);

    await getCompanyRelated(req('admin'), makeRes());

    expect(relatedService.getRelatedRecords).toHaveBeenCalledWith(
      't1',
      'u-self',
      { companyId: 'r1' },
      false,
    );
  });
});
