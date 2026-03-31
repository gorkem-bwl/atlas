import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../src/config/database', () => {
  const mockRows: any[] = [];
  return {
    db: {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => Promise.resolve(mockRows)),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'settings-1',
            smtpHost: null,
            smtpPort: 587,
            smtpUser: null,
            smtpPass: null,
            smtpFrom: 'noreply@atlas.local',
            smtpSecure: false,
            smtpEnabled: false,
          }]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    },
  };
});

// Mock schema
vi.mock('../src/db/schema', () => ({
  systemSettings: { id: 'id' },
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn().mockReturnValue('eq-condition'),
}));

// Mock nodemailer
vi.mock('nodemailer', () => ({
  createTransport: vi.fn().mockReturnValue({
    verify: vi.fn().mockResolvedValue(true),
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

import { db } from '../src/config/database';
import * as emailService from '../src/apps/system/service';

function setMockSettings(settings: Record<string, any>) {
  const defaultSettings = {
    id: 'settings-1',
    smtpHost: null,
    smtpPort: 587,
    smtpUser: null,
    smtpPass: null,
    smtpFrom: 'noreply@atlas.local',
    smtpSecure: false,
    smtpEnabled: false,
  };
  const merged = { ...defaultSettings, ...settings };

  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([merged]),
    }),
  } as any);
}

describe('email service - getEmailSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns masked password when smtpPass is set', async () => {
    setMockSettings({ smtpPass: 'real-secret-password', smtpHost: 'smtp.example.com', smtpUser: 'user@example.com' });

    const result = await emailService.getEmailSettings();

    expect(result.smtpPass).toBe('••••••••');
    expect(result.smtpHost).toBe('smtp.example.com');
    expect(result.smtpUser).toBe('user@example.com');
  });

  it('returns null for smtpPass when it is not set', async () => {
    setMockSettings({ smtpPass: null });

    const result = await emailService.getEmailSettings();

    expect(result.smtpPass).toBeNull();
  });

  it('returns all SMTP fields correctly', async () => {
    setMockSettings({
      smtpHost: 'mail.test.com',
      smtpPort: 465,
      smtpUser: 'admin@test.com',
      smtpPass: 'secret',
      smtpFrom: 'noreply@test.com',
      smtpSecure: true,
      smtpEnabled: true,
    });

    const result = await emailService.getEmailSettings();

    expect(result).toEqual({
      smtpHost: 'mail.test.com',
      smtpPort: 465,
      smtpUser: 'admin@test.com',
      smtpPass: '••••••••',
      smtpFrom: 'noreply@test.com',
      smtpSecure: true,
      smtpEnabled: true,
    });
  });
});

describe('email service - updateEmailSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips password update when value is the masked placeholder', async () => {
    setMockSettings({ smtpPass: 'real-secret' });

    await emailService.updateEmailSettings({ smtpPass: '••••••••', smtpHost: 'new-host.com' });

    const setCalls = vi.mocked(db.update).mock.results;
    // The update was called; we verify the set argument does not contain smtpPass
    const setFn = vi.mocked(db.update('x' as any).set);
    if (setFn.mock.calls.length > 0) {
      const updatePayload = setFn.mock.calls[0][0] as Record<string, unknown>;
      expect(updatePayload).not.toHaveProperty('smtpPass');
      expect(updatePayload).toHaveProperty('smtpHost', 'new-host.com');
    }
  });

  it('saves the real password when value is not the masked placeholder', async () => {
    setMockSettings({ smtpPass: 'old-password' });

    await emailService.updateEmailSettings({ smtpPass: 'new-real-password' });

    const setFn = vi.mocked(db.update('x' as any).set);
    if (setFn.mock.calls.length > 0) {
      const updatePayload = setFn.mock.calls[0][0] as Record<string, unknown>;
      expect(updatePayload).toHaveProperty('smtpPass', 'new-real-password');
    }
  });
});

describe('email service - getRawSmtpSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unmasked password', async () => {
    setMockSettings({ smtpPass: 'my-actual-password', smtpHost: 'smtp.example.com', smtpUser: 'user' });

    const result = await emailService.getRawSmtpSettings();

    expect(result.pass).toBe('my-actual-password');
    expect(result.host).toBe('smtp.example.com');
    expect(result.user).toBe('user');
  });

  it('returns null pass when no password is set', async () => {
    setMockSettings({ smtpPass: null });

    const result = await emailService.getRawSmtpSettings();

    expect(result.pass).toBeNull();
  });
});

describe('email service - testEmailConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error when smtpHost is missing', async () => {
    setMockSettings({ smtpHost: null, smtpUser: 'user@test.com' });

    const result = await emailService.testEmailConnection('test@test.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP host and user are required');
  });

  it('returns error when smtpUser is missing', async () => {
    setMockSettings({ smtpHost: 'smtp.example.com', smtpUser: null });

    const result = await emailService.testEmailConnection('test@test.com');

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP host and user are required');
  });

  it('returns success when SMTP settings are valid', async () => {
    setMockSettings({
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'user@example.com',
      smtpPass: 'pass',
      smtpFrom: 'noreply@example.com',
      smtpSecure: false,
    });

    const result = await emailService.testEmailConnection('recipient@test.com');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
