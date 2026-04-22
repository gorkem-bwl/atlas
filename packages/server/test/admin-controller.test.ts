import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-chars-long!!',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-32chars!!',
    NODE_ENV: 'test',
  },
}));

// Minimal db mock — each test stages its own chained return values.
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
  leftJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn(),
  orderBy: vi.fn(),
};
const updateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};
vi.mock('../src/config/database', () => ({
  db: {
    select: vi.fn(() => selectChain),
    update: vi.fn(() => updateChain),
  },
  pool: { connect: vi.fn(), end: vi.fn() },
}));
vi.mock('../src/services/platform/tenant.service', () => ({
  getTenantBySlug: vi.fn(),
  createTenant: vi.fn(),
}));
vi.mock('../src/services/auth.service', () => ({
  createPasswordAccount: vi.fn(),
}));
vi.mock('../src/utils/password', () => ({
  hashPassword: vi.fn(),
  validatePasswordStrength: vi.fn(),
}));
vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { updateSuperAdmin, impersonateTenant } from '../src/controllers/admin.controller';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  return res as Response;
}

describe('admin controller — updateSuperAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 if body.isSuperAdmin is not boolean', async () => {
    const req = { params: { userId: 'u1' }, body: { isSuperAdmin: 'yes' }, auth: { userId: 'admin1' } } as unknown as Request;
    const res = mockRes();
    await updateSuperAdmin(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('blocks self-revocation (cannot drop your own super-admin)', async () => {
    const req = { params: { userId: 'same-id' }, body: { isSuperAdmin: false }, auth: { userId: 'same-id' } } as unknown as Request;
    const res = mockRes();
    await updateSuperAdmin(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringMatching(/cannot revoke your own/i),
    }));
  });

  it('allows revoking someone else', async () => {
    updateChain.returning.mockResolvedValue([{ id: 'target', isSuperAdmin: false }]);
    const req = { params: { userId: 'target' }, body: { isSuperAdmin: false }, auth: { userId: 'admin1' } } as unknown as Request;
    const res = mockRes();
    await updateSuperAdmin(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'target', isSuperAdmin: false } });
  });

  it('allows self-GRANT (noop case — already super-admin but toggling true)', async () => {
    updateChain.returning.mockResolvedValue([{ id: 'same-id', isSuperAdmin: true }]);
    const req = { params: { userId: 'same-id' }, body: { isSuperAdmin: true }, auth: { userId: 'same-id' } } as unknown as Request;
    const res = mockRes();
    await updateSuperAdmin(req, res);
    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 'same-id', isSuperAdmin: true } });
  });

  it('404 when the target user does not exist', async () => {
    updateChain.returning.mockResolvedValue([]);
    const req = { params: { userId: 'nope' }, body: { isSuperAdmin: true }, auth: { userId: 'admin1' } } as unknown as Request;
    const res = mockRes();
    await updateSuperAdmin(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('admin controller — impersonateTenant', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404 when the target tenant does not exist', async () => {
    selectChain.limit.mockResolvedValueOnce([]); // tenant lookup returns empty
    const req = { params: { id: 'nope' }, auth: { userId: 'admin1', email: 'admin@x.com' } } as unknown as Request;
    const res = mockRes();
    await impersonateTenant(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('400 when the tenant has no members', async () => {
    selectChain.limit.mockResolvedValueOnce([{ id: 't1', name: 'Test', slug: 'test' }]); // tenant exists
    selectChain.limit.mockResolvedValueOnce([]); // no members
    const req = { params: { id: 't1' }, auth: { userId: 'admin1', email: 'admin@x.com' } } as unknown as Request;
    const res = mockRes();
    await impersonateTenant(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('issues a token with impersonatedBy claim, isSuperAdmin=false, 15m expiry', async () => {
    selectChain.limit.mockResolvedValueOnce([{ id: 't1', name: 'Test', slug: 'test' }]);
    selectChain.limit.mockResolvedValueOnce([{ userId: 'target-user', tenantId: 't1', role: 'owner' }]);
    const req = { params: { id: 't1' }, auth: { userId: 'admin1', email: 'admin@x.com' } } as unknown as Request;
    const res = mockRes();
    await impersonateTenant(req, res);

    const json = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(json.success).toBe(true);
    expect(json.data.expiresInSeconds).toBe(15 * 60);
    expect(typeof json.data.token).toBe('string');

    // Decode and assert claim shape.
    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(json.data.token, 'test-jwt-secret-min-32-chars-long!!') as Record<string, unknown>;
    expect(decoded.impersonatedBy).toBe('admin1');
    expect(decoded.isSuperAdmin).toBe(false); // crucial: impersonator cannot nest-escalate
    expect(decoded.tenantId).toBe('t1');
    expect(decoded.userId).toBe('target-user');
    expect(decoded.tenantRole).toBe('owner');
  });
});

// listAllUsers tested at integration level (live DB); mocking the
// three chained selects with joins is more fragile than illuminating.
