import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-chars-long!!',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-32chars!!',
    NODE_ENV: 'test',
  },
}));

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

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnThis();
  res.json = vi.fn().mockReturnThis();
  return res as Response;
}

function reqWith(auth: Record<string, unknown> | null, secret = 'test-jwt-secret-min-32-chars-long!!') {
  const token = auth ? jwt.sign(auth, secret, { expiresIn: '1h' }) : '';
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

  it('tenant-role=owner alone is NOT sufficient (v2.3.0 auth hardening)', async () => {
    const res = mockRes();
    const next = vi.fn();
    const req = reqWith({ userId: 'u1', tenantId: 't1', email: 'a@b.c', tenantRole: 'owner', isSuperAdmin: false });
    await adminAuthMiddleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
