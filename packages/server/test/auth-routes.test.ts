import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock auth service
vi.mock('../src/services/auth.service', () => ({
  findAccountByEmail: vi.fn(),
  generateTokens: vi.fn(),
  verifyRefreshToken: vi.fn(),
  isUserSuperAdmin: vi.fn(),
  getUserCount: vi.fn(),
  createPasswordAccount: vi.fn(),
  listUserAccounts: vi.fn(),
}));

// Mock tenant service
vi.mock('../src/services/platform/tenant.service', () => ({
  listTenantsForUser: vi.fn().mockResolvedValue([{ id: 't1' }]),
  createTenant: vi.fn(),
  getTenantById: vi.fn(),
}));

// Mock password utils
vi.mock('../src/utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-pw'),
  verifyPassword: vi.fn(),
  validatePasswordStrength: vi.fn().mockReturnValue({ valid: true }),
}));

// Mock google auth
vi.mock('../src/services/google-auth', () => ({
  isGoogleConfigured: vi.fn().mockReturnValue(false),
  getAuthUrl: vi.fn(),
  exchangeCode: vi.fn(),
  createOAuth2Client: vi.fn(),
}));

// Mock crypto
vi.mock('../src/utils/crypto', () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((v: string) => v.replace('enc:', '')),
}));

// Mock env
vi.mock('../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-min-32-chars-long!!',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-32chars!!',
    CLIENT_PUBLIC_URL: 'http://localhost:5180',
    SERVER_PUBLIC_URL: 'http://localhost:3001',
  },
}));

// Mock redis (used by workers)
vi.mock('../src/config/redis', () => ({
  getRedisClient: vi.fn().mockReturnValue(null),
}));

// Mock workers
vi.mock('../src/workers', () => ({
  enqueueSyncJob: vi.fn(),
  SyncJobType: {},
}));

import * as authController from '../src/controllers/auth.controller';
import * as authService from '../src/services/auth.service';
import { verifyPassword } from '../src/utils/password';

function makeReq(overrides: Record<string, any> = {}): Request {
  return {
    auth: { userId: 'u1', accountId: 'a1', email: 'test@test.com', tenantId: 't1' },
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn(),
  };
  return res as Response;
}

describe('auth controller — loginWithPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when email is missing', async () => {
    const req = makeReq({ body: { password: 'secret123' } });
    const res = makeRes();

    await authController.loginWithPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Email and password are required' })
    );
  });

  it('returns 400 when password is missing', async () => {
    const req = makeReq({ body: { email: 'user@test.com' } });
    const res = makeRes();

    await authController.loginWithPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Email and password are required' })
    );
  });

  it('returns 401 when account is not found', async () => {
    vi.mocked(authService.findAccountByEmail).mockResolvedValue(null);

    const req = makeReq({ body: { email: 'nobody@test.com', password: 'secret123' } });
    const res = makeRes();

    await authController.loginWithPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Invalid email or password' })
    );
  });

  it('returns 401 when password is wrong', async () => {
    vi.mocked(authService.findAccountByEmail).mockResolvedValue({
      id: 'a1',
      userId: 'u1',
      email: 'user@test.com',
      name: 'User',
      passwordHash: 'hashed-pw',
      pictureUrl: null,
      provider: 'password',
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(verifyPassword).mockResolvedValue(false);

    const req = makeReq({ body: { email: 'user@test.com', password: 'wrong-password' } });
    const res = makeRes();

    await authController.loginWithPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Invalid email or password' })
    );
  });

  it('returns tokens and account on successful login', async () => {
    const mockAccount = {
      id: 'a1',
      userId: 'u1',
      email: 'user@test.com',
      name: 'Test User',
      passwordHash: 'hashed-pw',
      pictureUrl: null,
      provider: 'password',
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(authService.findAccountByEmail).mockResolvedValue(mockAccount as any);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    vi.mocked(authService.isUserSuperAdmin).mockResolvedValue(false);
    vi.mocked(authService.generateTokens).mockReturnValue({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
    });

    const req = makeReq({ body: { email: 'user@test.com', password: 'correct-password' } });
    const res = makeRes();

    await authController.loginWithPassword(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          account: expect.objectContaining({
            id: 'a1',
            email: 'user@test.com',
          }),
        }),
      })
    );
  });
});

describe('auth controller — refreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when refreshToken is missing', async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();

    await authController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Missing refresh token' })
    );
  });

  it('returns 401 when refresh token is invalid', async () => {
    vi.mocked(authService.verifyRefreshToken).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const req = makeReq({ body: { refreshToken: 'bad-token' } });
    const res = makeRes();

    await authController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Invalid refresh token' })
    );
  });

  it('returns new tokens on valid refresh', async () => {
    vi.mocked(authService.verifyRefreshToken).mockReturnValue({
      userId: 'u1',
      accountId: 'a1',
      email: 'user@test.com',
    } as any);
    vi.mocked(authService.isUserSuperAdmin).mockResolvedValue(false);
    vi.mocked(authService.generateTokens).mockReturnValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    const req = makeReq({ body: { refreshToken: 'valid-refresh-token' } });
    const res = makeRes();

    await authController.refreshToken(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
      })
    );
  });
});

describe('auth controller — getSetupStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns needsSetup true when no users exist', async () => {
    vi.mocked(authService.getUserCount).mockResolvedValue(0);

    const req = makeReq();
    const res = makeRes();

    await authController.getSetupStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ needsSetup: true }),
      })
    );
  });

  it('returns needsSetup false when users exist', async () => {
    vi.mocked(authService.getUserCount).mockResolvedValue(3);

    const req = makeReq();
    const res = makeRes();

    await authController.getSetupStatus(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ needsSetup: false }),
      })
    );
  });
});

describe('auth controller — forgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when email is missing', async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();

    await authController.forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Email is required' })
    );
  });

  it('returns generic success even when account is not found', async () => {
    vi.mocked(authService.findAccountByEmail).mockResolvedValue(null);

    const req = makeReq({ body: { email: 'nobody@test.com' } });
    const res = makeRes();

    await authController.forgotPassword(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('If an account exists'),
      })
    );
  });
});
