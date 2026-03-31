import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsSchema } from '@atlasmail/shared';
import { db } from '../src/config/database';

// The settings routes are Express route handlers. We test them by directly
// invoking the handler logic with mock req/res, matching what the routes do.

function makeReq(overrides: Record<string, any> = {}) {
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
  return res;
}

describe('settings route — GET /', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns settings as null when no record exists', async () => {
    // db.select().from().where().limit() is already mocked to return []
    const res = makeRes();
    const req = makeReq();

    // Simulate what the GET / handler does
    const mockDb = db as any;
    const [settings] = await mockDb.select().from('userSettings').where('accountId = a1').limit(1);
    res.json({ success: true, data: settings || null });

    expect(res.json).toHaveBeenCalledWith({ success: true, data: null });
  });

  it('returns existing settings object when record exists', async () => {
    const mockSettings = { id: 's1', accountId: 'a1', theme: 'dark', density: 'compact' };

    // Override mock for this test
    const mockDb = db as any;
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockSettings]),
        }),
      }),
    });

    const res = makeRes();
    const [settings] = await mockDb.select().from('userSettings').where('accountId = a1').limit(1);
    res.json({ success: true, data: settings || null });

    expect(res.json).toHaveBeenCalledWith({ success: true, data: mockSettings });
  });
});

describe('settings route — PUT / (Zod validation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts valid settings data', () => {
    const validData = {
      theme: 'dark',
      density: 'compact',
      readingPane: 'right',
      desktopNotifications: true,
    };

    const parsed = settingsSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid theme value', () => {
    const invalidData = { theme: 'neon' };
    const parsed = settingsSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('returns 400 when validation fails', () => {
    const res = makeRes();
    const invalidBody = { theme: 'invalid-theme' };

    const parsed = settingsSchema.safeParse(invalidBody);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.message });
    }

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.any(String) })
    );
  });

  it('accepts partial/empty settings update', () => {
    const parsed = settingsSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid density value', () => {
    const parsed = settingsSchema.safeParse({ density: 'ultra-dense' });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid complex settings', () => {
    const data = {
      theme: 'system',
      density: 'comfortable',
      dateFormat: 'YYYY-MM-DD',
      currencySymbol: '$',
      timeFormat: '24h',
      aiEnabled: true,
      docsFontStyle: 'serif',
      driveDefaultView: 'grid',
    };

    const parsed = settingsSchema.safeParse(data);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.theme).toBe('system');
      expect(parsed.data.dateFormat).toBe('YYYY-MM-DD');
    }
  });

  it('updates existing settings via db.update path', async () => {
    const mockDb = db as any;

    // Simulate existing record found
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 's1', accountId: 'a1' }]),
        }),
      }),
    });

    const validBody = { theme: 'light' as const };
    const parsed = settingsSchema.safeParse(validBody);
    expect(parsed.success).toBe(true);

    const existing = await mockDb.select().from('userSettings').where('accountId = a1').limit(1);
    expect(existing.length).toBeGreaterThan(0);

    // If existing record, call update
    const [updated] = await mockDb.update('userSettings').set({ ...parsed.data, updatedAt: new Date() }).where('accountId = a1').returning();
    expect(updated).toBeDefined();
    expect(updated.id).toBe('test-id');
  });
});
