import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request } from 'express';

// Note: TEST_JWT_SECRET / TEST_JWT_REFRESH_SECRET from helpers/test-utils
// are inlined in the mock below because vi.mock factories run before
// imports are materialised. Keep the two in sync.
vi.mock('../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-chars-long!!',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-32chars!!',
    NODE_ENV: 'test',
  },
}));

import { mockRes, signTestToken } from './helpers/test-utils';

const dbSelectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};
vi.mock('../src/config/database', () => ({
  db: { select: vi.fn(() => dbSelectChain) },
  pool: { connect: vi.fn(), end: vi.fn() },
}));

import { adminAuthMiddleware } from '../src/middleware/admin-auth';

function reqWith(auth: Record<string, unknown> | null, secret?: string) {
  const token = auth ? signTestToken(auth, { secret }) : '';
  return {
    headers: { authorization: token ? `Bearer ${token}` : '' },
  } as unknown as Request;
}

describe('adminAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectChain.limit.mockResolvedValue([]);
  });

  it('401 when no authorization header', async () => {
    const res = mockRes();
    const next = vi.fn();
    await adminAuthMiddleware({ headers: {} } as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 when the token is invalid', async () => {
    const res = mockRes();
    const next = vi.fn();
    const req = { headers: { authorization: 'Bearer garbage.token.here' } } as unknown as Request;
    await adminAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('401 when the token is signed with the wrong secret', async () => {
    const res = mockRes();
    const next = vi.fn();
    const req = reqWith({ userId: 'u1', tenantId: 't1', email: 'a@b.c', isSuperAdmin: true }, 'wrong-secret');
    await adminAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('403 when JWT explicitly says isSuperAdmin: false', async () => {
    const res = mockRes();
    const next = vi.fn();
    const req = reqWith({ userId: 'u1', tenantId: 't1', email: 'a@b.c', isSuperAdmin: false });
    await adminAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Super-admin access required' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('403 when JWT has no isSuperAdmin claim AND DB says user is not super-admin (fallback path)', async () => {
    dbSelectChain.limit.mockResolvedValue([{ isSuperAdmin: false }]);
    const res = mockRes();
    const next = vi.fn();
    const req = reqWith({ userId: 'u1', tenantId: 't1', email: 'a@b.c' }); // no isSuperAdmin
    await adminAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('403 when JWT has no isSuperAdmin claim AND user does not exist in DB', async () => {
    dbSelectChain.limit.mockResolvedValue([]);
    const res = mockRes();
    const next = vi.fn();
    const req = reqWith({ userId: 'u1', tenantId: 't1', email: 'a@b.c' });
    await adminAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('passes when JWT carries isSuperAdmin: true', async () => {
    const res = mockRes();
    const next = vi.fn();
    const req = reqWith({ userId: 'u1', tenantId: 't1', email: 'a@b.c', isSuperAdmin: true });
    await adminAuthMiddleware(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('passes when JWT has no claim but DB says user is super-admin', async () => {
    dbSelectChain.limit.mockResolvedValue([{ isSuperAdmin: true }]);
    const res = mockRes();
    const next = vi.fn();
    const req = reqWith({ userId: 'u1', tenantId: 't1', email: 'a@b.c' });
    await adminAuthMiddleware(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('tenant-role=owner alone is NOT sufficient — super-admin is distinct from tenant ownership', async () => {
    const res = mockRes();
    const next = vi.fn();
    const req = reqWith({ userId: 'u1', tenantId: 't1', email: 'a@b.c', tenantRole: 'owner', isSuperAdmin: false });
    await adminAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
