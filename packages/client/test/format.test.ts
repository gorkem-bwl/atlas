import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../src/stores/settings-store';
import { formatBytes, formatDate, formatCurrency, formatNumber, formatRelativeDate, formatDateTime } from '../src/lib/format';

// Mock i18n (settings-store imports it)
import { vi } from 'vitest';
vi.mock('../src/i18n', () => ({
  default: {
    language: 'en',
    changeLanguage: vi.fn(),
  },
}));

describe('formatBytes', () => {
  it('returns em dash for 0', () => {
    expect(formatBytes(0)).toBe('—');
  });

  it('returns em dash for null', () => {
    expect(formatBytes(null)).toBe('—');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('formats fractional values', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('returns em dash for negative numbers', () => {
    expect(formatBytes(-1)).toBe('—');
  });
});

describe('formatDate', () => {
  beforeEach(() => {
    useSettingsStore.setState({ dateFormat: 'DD/MM/YYYY' });
  });

  it('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats date as DD/MM/YYYY', () => {
    const date = new Date(2025, 2, 15); // March 15, 2025
    expect(formatDate(date)).toBe('15/03/2025');
  });

  it('formats date as MM/DD/YYYY', () => {
    useSettingsStore.setState({ dateFormat: 'MM/DD/YYYY' });
    const date = new Date(2025, 2, 15);
    expect(formatDate(date)).toBe('03/15/2025');
  });

  it('formats date as YYYY-MM-DD', () => {
    useSettingsStore.setState({ dateFormat: 'YYYY-MM-DD' });
    const date = new Date(2025, 2, 15);
    expect(formatDate(date)).toBe('2025-03-15');
  });

  it('accepts date string input', () => {
    const result = formatDate('2025-06-01T12:00:00Z');
    expect(result).toMatch(/01\/06\/2025/);
  });

  it('returns em dash for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatCurrency', () => {
  beforeEach(() => {
    useSettingsStore.setState({ currencySymbol: '$', numberFormat: 'comma-period' });
  });

  it('returns em dash for null', () => {
    expect(formatCurrency(null)).toBe('—');
  });

  it('formats simple integer', () => {
    expect(formatCurrency(100)).toBe('$100');
  });

  it('formats with thousands separator', () => {
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('formats decimal values', () => {
    expect(formatCurrency(99.99)).toBe('$99.99');
  });

  it('uses custom currency symbol', () => {
    useSettingsStore.setState({ currencySymbol: '€' });
    expect(formatCurrency(50)).toBe('€50');
  });
});

describe('formatNumber', () => {
  beforeEach(() => {
    useSettingsStore.setState({ numberFormat: 'comma-period' });
  });

  it('returns em dash for null', () => {
    expect(formatNumber(null)).toBe('—');
  });

  it('formats integer with comma-period style', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('formats with period-comma style', () => {
    useSettingsStore.setState({ numberFormat: 'period-comma' });
    expect(formatNumber(1234567.89)).toBe('1.234.567,89');
  });

  it('formats with space-comma style', () => {
    useSettingsStore.setState({ numberFormat: 'space-comma' });
    expect(formatNumber(1234567.89)).toBe('1 234 567,89');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-42)).toBe('-42');
  });

  it('respects explicit decimals parameter', () => {
    expect(formatNumber(100, 2)).toBe('100.00');
  });
});

describe('formatRelativeDate', () => {
  it('returns em dash for null', () => {
    expect(formatRelativeDate(null)).toBe('—');
  });

  it('returns "Today" for today', () => {
    expect(formatRelativeDate(new Date())).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeDate(yesterday)).toBe('Yesterday');
  });

  it('returns "N days ago" for recent dates', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    expect(formatRelativeDate(threeDaysAgo)).toBe('3 days ago');
  });

  it('falls back to formatDate for older dates', () => {
    useSettingsStore.setState({ dateFormat: 'YYYY-MM-DD' });
    const oldDate = new Date(2020, 0, 1);
    expect(formatRelativeDate(oldDate)).toBe('2020-01-01');
  });
});
