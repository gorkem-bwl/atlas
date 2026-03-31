import { describe, it, expect } from 'vitest';

// ─── Re-implement pure utility functions from home.tsx for testing ───
// These functions are not exported from home.tsx, so we re-create them
// here to verify the math and logic are correct.

// Dock magnification: scaleValue maps a value from one range to another
function scaleValue(value: number, from: [number, number], to: [number, number]): number {
  const scale = (to[1] - to[0]) / (from[1] - from[0]);
  const capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
  return Math.floor(capped * scale + to[0]);
}

// Dock magnification: quadratic falloff
function computeDockIconSize(mouseX: number, itemCenterX: number): number {
  const BASE = 52;
  const MAX = 82;
  const RANGE = 200;
  const distance = Math.abs(mouseX - itemCenterX);
  const normalized = Math.min(distance / RANGE, 1);
  const scale = Math.max(0, 1 - normalized * normalized);
  return BASE + (MAX - BASE) * scale;
}

// Greeting logic
function getGreetingKey(hour: number): string {
  if (hour < 12) return 'home.goodMorning';
  if (hour < 17) return 'home.goodAfternoon';
  return 'home.goodEvening';
}

// Time formatting
function formatTime(date: Date, showSeconds = false): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
  });
}

// Daily wallpaper index
function getDailyImageIndex(bgCount: number): number {
  const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return daysSinceEpoch % bgCount;
}

// Time-of-day tint
function getTimeTint(hour: number): string {
  if (hour >= 5 && hour < 7) return 'rgba(255, 180, 50, 0.12)';
  if (hour >= 7 && hour < 11) return 'rgba(255, 220, 130, 0.06)';
  if (hour >= 11 && hour < 14) return 'rgba(255, 255, 255, 0.03)';
  if (hour >= 14 && hour < 17) return 'rgba(255, 170, 60, 0.08)';
  if (hour >= 17 && hour < 19) return 'rgba(255, 130, 30, 0.14)';
  if (hour >= 19 && hour < 21) return 'rgba(80, 60, 180, 0.12)';
  return 'rgba(20, 30, 80, 0.18)';
}

// ─── scaleValue tests ───────────────────────────────────────────

describe('scaleValue (dock magnification utility)', () => {
  it('maps minimum input to minimum output', () => {
    expect(scaleValue(0, [0, 100], [50, 100])).toBe(50);
  });

  it('maps maximum input to maximum output', () => {
    expect(scaleValue(100, [0, 100], [50, 100])).toBe(100);
  });

  it('maps midpoint correctly', () => {
    expect(scaleValue(50, [0, 100], [0, 200])).toBe(100);
  });

  it('clamps values below input range', () => {
    expect(scaleValue(-50, [0, 100], [0, 200])).toBe(0);
  });

  it('clamps values above input range', () => {
    expect(scaleValue(150, [0, 100], [0, 200])).toBe(200);
  });

  it('floors the result to integer', () => {
    // 33 in [0, 100] -> [0, 200] = 66
    expect(scaleValue(33, [0, 100], [0, 200])).toBe(66);
  });
});

// ─── Dock icon size (quadratic falloff) ─────────────────────────

describe('computeDockIconSize (quadratic falloff)', () => {
  it('returns MAX size when mouse is directly over item', () => {
    expect(computeDockIconSize(300, 300)).toBe(82);
  });

  it('returns BASE size when mouse is beyond RANGE', () => {
    expect(computeDockIconSize(600, 300)).toBe(52);
  });

  it('returns BASE size at exactly RANGE distance', () => {
    // At distance=200, normalized=1, scale=0, size=52
    expect(computeDockIconSize(500, 300)).toBe(52);
  });

  it('returns intermediate size for nearby items', () => {
    const size = computeDockIconSize(350, 300);
    expect(size).toBeGreaterThan(52);
    expect(size).toBeLessThan(82);
  });

  it('applies parabolic (quadratic) falloff, not linear', () => {
    // At distance 100 (half of RANGE 200):
    // normalized=0.5, scale=1-0.25=0.75, size=52+(30*0.75)=74.5
    const sizeHalf = computeDockIconSize(400, 300);
    // At distance 50 (quarter of RANGE):
    // normalized=0.25, scale=1-0.0625=0.9375, size=52+(30*0.9375)=80.125
    const sizeQuarter = computeDockIconSize(350, 300);

    // Quarter distance should be closer to MAX than half distance
    expect(sizeQuarter).toBeGreaterThan(sizeHalf);
    // Both should be between BASE and MAX
    expect(sizeHalf).toBeGreaterThanOrEqual(52);
    expect(sizeQuarter).toBeLessThanOrEqual(82);
  });

  it('is symmetric (left and right of center)', () => {
    const sizeLeft = computeDockIconSize(200, 300);
    const sizeRight = computeDockIconSize(400, 300);
    expect(sizeLeft).toBe(sizeRight);
  });
});

// ─── Greeting key ───────────────────────────────────────────────

describe('getGreetingKey', () => {
  it('returns morning greeting before noon', () => {
    expect(getGreetingKey(8)).toBe('home.goodMorning');
  });

  it('returns afternoon greeting between 12 and 17', () => {
    expect(getGreetingKey(14)).toBe('home.goodAfternoon');
  });

  it('returns evening greeting after 17', () => {
    expect(getGreetingKey(20)).toBe('home.goodEvening');
  });

  it('returns morning at midnight', () => {
    expect(getGreetingKey(0)).toBe('home.goodMorning');
  });

  it('returns afternoon at exactly 12', () => {
    expect(getGreetingKey(12)).toBe('home.goodAfternoon');
  });

  it('returns evening at exactly 17', () => {
    expect(getGreetingKey(17)).toBe('home.goodEvening');
  });
});

// ─── Clock formatting ───────────────────────────────────────────

describe('formatTime', () => {
  it('formats time without seconds by default', () => {
    const date = new Date(2026, 0, 1, 14, 30, 45);
    const result = formatTime(date);
    // Should contain hours and minutes, no seconds
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    expect(result).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  it('formats time with seconds when requested', () => {
    const date = new Date(2026, 0, 1, 14, 30, 45);
    const result = formatTime(date, true);
    // Should contain seconds
    expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });
});

// ─── Daily wallpaper selection ──────────────────────────────────

describe('getDailyImageIndex', () => {
  it('returns a valid index within range', () => {
    const index = getDailyImageIndex(12);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(12);
  });

  it('returns consistent index for same day', () => {
    const idx1 = getDailyImageIndex(12);
    const idx2 = getDailyImageIndex(12);
    expect(idx1).toBe(idx2);
  });

  it('returns integer values', () => {
    const index = getDailyImageIndex(12);
    expect(Number.isInteger(index)).toBe(true);
  });
});

// ─── Time-of-day tint ───────────────────────────────────────────

describe('getTimeTint', () => {
  it('returns warm golden for early morning (5-7)', () => {
    expect(getTimeTint(6)).toBe('rgba(255, 180, 50, 0.12)');
  });

  it('returns light warm for morning (7-11)', () => {
    expect(getTimeTint(9)).toBe('rgba(255, 220, 130, 0.06)');
  });

  it('returns neutral for midday (11-14)', () => {
    expect(getTimeTint(12)).toBe('rgba(255, 255, 255, 0.03)');
  });

  it('returns warm amber for afternoon (14-17)', () => {
    expect(getTimeTint(15)).toBe('rgba(255, 170, 60, 0.08)');
  });

  it('returns deep amber for golden hour (17-19)', () => {
    expect(getTimeTint(18)).toBe('rgba(255, 130, 30, 0.14)');
  });

  it('returns blue-purple for dusk (19-21)', () => {
    expect(getTimeTint(20)).toBe('rgba(80, 60, 180, 0.12)');
  });

  it('returns deep blue for night (21-5)', () => {
    expect(getTimeTint(23)).toBe('rgba(20, 30, 80, 0.18)');
    expect(getTimeTint(3)).toBe('rgba(20, 30, 80, 0.18)');
  });
});
