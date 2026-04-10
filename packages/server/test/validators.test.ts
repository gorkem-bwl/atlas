import { describe, it, expect } from 'vitest';
import { settingsSchema, loginSchema, composeSchema, searchSchema } from '@atlas-platform/shared';

describe('settingsSchema', () => {
  it('accepts fully valid settings object', () => {
    const data = {
      theme: 'dark',
      density: 'compact',
      readingPane: 'right',
      autoAdvance: 'next',
      desktopNotifications: true,
      notificationSound: false,
      signatureHtml: '<p>My Signature</p>',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    };

    const result = settingsSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme).toBe('dark');
      expect(result.data.desktopNotifications).toBe(true);
    }
  });

  it('accepts empty object (all fields are optional)', () => {
    const result = settingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects invalid theme enum value', () => {
    const result = settingsSchema.safeParse({ theme: 'neon' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid density enum value', () => {
    const result = settingsSchema.safeParse({ density: 'spacious' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid readingPane enum value', () => {
    const result = settingsSchema.safeParse({ readingPane: 'top' });
    expect(result.success).toBe(false);
  });

  it('accepts null for nullable fields like signatureHtml', () => {
    const result = settingsSchema.safeParse({ signatureHtml: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.signatureHtml).toBeNull();
    }
  });

  it('validates undoSendDelay accepts only specific literal values', () => {
    expect(settingsSchema.safeParse({ undoSendDelay: 5 }).success).toBe(true);
    expect(settingsSchema.safeParse({ undoSendDelay: 10 }).success).toBe(true);
    expect(settingsSchema.safeParse({ undoSendDelay: 20 }).success).toBe(true);
    expect(settingsSchema.safeParse({ undoSendDelay: 30 }).success).toBe(true);
    expect(settingsSchema.safeParse({ undoSendDelay: 15 }).success).toBe(false);
    expect(settingsSchema.safeParse({ undoSendDelay: 0 }).success).toBe(false);
  });

  it('validates number constraints on tablesDefaultRowCount', () => {
    expect(settingsSchema.safeParse({ tablesDefaultRowCount: 50 }).success).toBe(true);
    expect(settingsSchema.safeParse({ tablesDefaultRowCount: 0 }).success).toBe(true);
    expect(settingsSchema.safeParse({ tablesDefaultRowCount: 100 }).success).toBe(true);
    expect(settingsSchema.safeParse({ tablesDefaultRowCount: -1 }).success).toBe(false);
    expect(settingsSchema.safeParse({ tablesDefaultRowCount: 101 }).success).toBe(false);
    expect(settingsSchema.safeParse({ tablesDefaultRowCount: 3.5 }).success).toBe(false);
  });

  it('rejects wrong type for boolean fields', () => {
    const result = settingsSchema.safeParse({ desktopNotifications: 'yes' });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({
      code: 'auth-code-123',
      redirectUri: 'http://localhost:5180/callback',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = loginSchema.safeParse({
      code: '',
      redirectUri: 'http://localhost:5180/callback',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL for redirectUri', () => {
    const result = loginSchema.safeParse({
      code: 'valid-code',
      redirectUri: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ code: 'abc' }).success).toBe(false);
  });
});

describe('composeSchema', () => {
  it('accepts valid compose data', () => {
    const result = composeSchema.safeParse({
      to: ['user@example.com'],
      bodyHtml: '<p>Hello</p>',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty to array', () => {
    const result = composeSchema.safeParse({
      to: [],
      bodyHtml: '<p>Hello</p>',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email in to array', () => {
    const result = composeSchema.safeParse({
      to: ['not-an-email'],
      bodyHtml: '<p>Hello</p>',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional cc and bcc', () => {
    const result = composeSchema.safeParse({
      to: ['a@b.com'],
      cc: ['c@d.com'],
      bcc: ['e@f.com'],
      bodyHtml: '<p>Test</p>',
      subject: 'Test subject',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing bodyHtml', () => {
    const result = composeSchema.safeParse({
      to: ['user@example.com'],
    });
    expect(result.success).toBe(false);
  });
});

describe('searchSchema', () => {
  it('accepts valid search query', () => {
    const result = searchSchema.safeParse({ q: 'test query' });
    expect(result.success).toBe(true);
  });

  it('rejects empty search query', () => {
    const result = searchSchema.safeParse({ q: '' });
    expect(result.success).toBe(false);
  });

  it('accepts query with optional filters', () => {
    const result = searchSchema.safeParse({
      q: 'invoice',
      from: 'sender@example.com',
      hasAttachment: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects query exceeding max length', () => {
    const result = searchSchema.safeParse({ q: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});
