import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock the system service before importing the controller
vi.mock('../src/apps/system/service', () => ({
  getEmailSettings: vi.fn(),
  updateEmailSettings: vi.fn(),
  testEmailConnection: vi.fn(),
}));

import * as controller from '../src/apps/system/controller';
import * as systemService from '../src/apps/system/service';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    auth: { userId: 'u1', accountId: 'a1', email: 'test@test.com' },
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
  };
  return res as Response;
}

describe('system controller — getMetrics', () => {
  it('returns success:true with metric data', async () => {
    const req = makeReq();
    const res = makeRes();

    await controller.getMetrics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          cpu: expect.any(Object),
          memory: expect.any(Object),
          disk: expect.any(Object),
          uptime: expect.any(Object),
          node: expect.any(Object),
          os: expect.any(Object),
          process: expect.any(Object),
          timestamp: expect.any(String),
        }),
      })
    );
  });

  it('returns metric data with proper cpu fields', async () => {
    const req = makeReq();
    const res = makeRes();

    await controller.getMetrics(req, res);

    const call = (res.json as any).mock.calls[0][0];
    expect(call.data.cpu).toHaveProperty('usage');
    expect(call.data.cpu).toHaveProperty('model');
    expect(call.data.cpu).toHaveProperty('cores');
    expect(typeof call.data.cpu.cores).toBe('number');
  });

  it('returns metric data with proper memory fields', async () => {
    const req = makeReq();
    const res = makeRes();

    await controller.getMetrics(req, res);

    const call = (res.json as any).mock.calls[0][0];
    expect(call.data.memory).toHaveProperty('total');
    expect(call.data.memory).toHaveProperty('used');
    expect(call.data.memory).toHaveProperty('free');
    expect(call.data.memory).toHaveProperty('usagePercent');
    expect(call.data.memory.total).toBeGreaterThan(0);
  });
});

describe('system controller — getEmailSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 when user is not super admin', async () => {
    const req = makeReq({ auth: { userId: 'u1', accountId: 'a1', email: 'user@test.com' } } as any);
    const res = makeRes();

    await controller.getEmailSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Admin access required' })
    );
  });

  it('returns email settings for super admin with masked password', async () => {
    const mockSettings = {
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'user@example.com',
      smtpPass: '••••••••',
      smtpFrom: 'Atlas <noreply@atlas.so>',
      smtpSecure: false,
      smtpEnabled: true,
    };
    vi.mocked(systemService.getEmailSettings).mockResolvedValue(mockSettings);

    const req = makeReq({
      auth: { userId: 'u1', accountId: 'a1', email: 'admin@test.com', isSuperAdmin: true },
    } as any);
    const res = makeRes();

    await controller.getEmailSettings(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: mockSettings })
    );
    expect(mockSettings.smtpPass).toBe('••••••••');
  });

  it('returns 403 when isSuperAdmin is false', async () => {
    const req = makeReq({
      auth: { userId: 'u1', accountId: 'a1', email: 'user@test.com', isSuperAdmin: false },
    } as any);
    const res = makeRes();

    await controller.getEmailSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('system controller — updateEmailSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for non-admin users', async () => {
    const req = makeReq({ auth: { userId: 'u1', accountId: 'a1', email: 'user@test.com' } } as any);
    const res = makeRes();

    await controller.updateEmailSettings(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('updates settings for admin user', async () => {
    const updatedSettings = {
      smtpHost: 'smtp.new.com',
      smtpPort: 465,
      smtpUser: 'newuser@new.com',
      smtpPass: '••••••••',
      smtpFrom: 'Atlas <noreply@new.com>',
      smtpSecure: true,
      smtpEnabled: true,
    };
    vi.mocked(systemService.updateEmailSettings).mockResolvedValue(updatedSettings);

    const req = makeReq({
      auth: { userId: 'u1', accountId: 'a1', email: 'admin@test.com', isSuperAdmin: true },
      body: { smtpHost: 'smtp.new.com', smtpPort: 465 },
    } as any);
    const res = makeRes();

    await controller.updateEmailSettings(req, res);

    expect(systemService.updateEmailSettings).toHaveBeenCalledWith({ smtpHost: 'smtp.new.com', smtpPort: 465 });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: updatedSettings })
    );
  });
});

describe('system controller — testEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for non-admin users', async () => {
    const req = makeReq({ body: { to: 'test@test.com' } } as any);
    const res = makeRes();

    await controller.testEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 400 when no recipient is provided', async () => {
    const req = makeReq({
      auth: { userId: 'u1', accountId: 'a1', email: 'admin@test.com', isSuperAdmin: true },
      body: {},
    } as any);
    const res = makeRes();

    await controller.testEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Recipient email is required' })
    );
  });
});
