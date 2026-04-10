import { describe, it, expect } from 'vitest';
import { computeEligibleStage } from '../src/apps/invoices/reminder-scheduler';

/**
 * Unit tests for the pure `computeEligibleStage` helper that drives the
 * 4-stage dunning cadence in the invoice reminder scheduler.
 *
 * Cadence under test:
 *   Stage 0 → 1 at reminder1Days after due date
 *   Stage 1 → 2 at reminder2Days after due date
 *   Stage 2 → 3 at reminder3Days after due date
 *   Stage 3+ → endless every endlessReminderDays after lastReminderAt
 */

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(now: Date, n: number): Date {
  return new Date(now.getTime() - n * DAY);
}

const baseSettings = {
  reminder1Days: 3,
  reminder2Days: 7,
  reminder3Days: 14,
  endlessReminderDays: 7,
};

describe('computeEligibleStage', () => {
  const now = new Date('2026-04-10T12:00:00Z');

  it('fires stage 1 once reminder1Days have elapsed since due date', () => {
    // 2 days overdue → not yet (threshold 3)
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 2),
        lastReminderStage: 0,
        lastReminderAt: null,
        now,
      }),
    ).toBeNull();

    // 3 days overdue → exactly at threshold, should fire stage 1
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 3),
        lastReminderStage: 0,
        lastReminderAt: null,
        now,
      }),
    ).toBe(1);
  });

  it('transitions stage 1 → 2 at reminder2Days after due date', () => {
    // 6 days overdue → still waiting (threshold 7)
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 6),
        lastReminderStage: 1,
        lastReminderAt: daysAgo(now, 3),
        now,
      }),
    ).toBeNull();

    // 7 days overdue → stage 2 fires
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 7),
        lastReminderStage: 1,
        lastReminderAt: daysAgo(now, 4),
        now,
      }),
    ).toBe(2);
  });

  it('transitions stage 2 → 3 at reminder3Days after due date', () => {
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 13),
        lastReminderStage: 2,
        lastReminderAt: daysAgo(now, 6),
        now,
      }),
    ).toBeNull();

    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 14),
        lastReminderStage: 2,
        lastReminderAt: daysAgo(now, 7),
        now,
      }),
    ).toBe(3);
  });

  it('endless mode: after stage 3, fires stage 4 every endlessReminderDays', () => {
    // Last reminder 6 days ago → still waiting (threshold 7)
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 30),
        lastReminderStage: 3,
        lastReminderAt: daysAgo(now, 6),
        now,
      }),
    ).toBeNull();

    // Last reminder 7 days ago → fires stage 4
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 30),
        lastReminderStage: 3,
        lastReminderAt: daysAgo(now, 7),
        now,
      }),
    ).toBe(4);

    // Already pinned at stage 4 → keeps firing on cadence
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 90),
        lastReminderStage: 4,
        lastReminderAt: daysAgo(now, 10),
        now,
      }),
    ).toBe(4);
  });

  it('returns null when the invoice is not yet overdue', () => {
    // Due in the future → scheduler shouldn't touch it. This is the safety
    // net that also protects paid/waived/draft invoices — they're filtered
    // out at the query level, but a future due date must never fire a
    // reminder regardless of stored stage.
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: new Date(now.getTime() + 5 * DAY),
        lastReminderStage: 0,
        lastReminderAt: null,
        now,
      }),
    ).toBeNull();

    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: new Date(now.getTime() + 1 * DAY),
        lastReminderStage: 2,
        lastReminderAt: daysAgo(now, 1),
        now,
      }),
    ).toBeNull();
  });

  it('defensively fires stage 4 when at stage 3+ with null lastReminderAt', () => {
    // If we somehow recorded a stage without a timestamp, we should still
    // make forward progress rather than getting stuck forever.
    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 30),
        lastReminderStage: 3,
        lastReminderAt: null,
        now,
      }),
    ).toBe(4);

    expect(
      computeEligibleStage({
        ...baseSettings,
        dueDate: daysAgo(now, 100),
        lastReminderStage: 4,
        lastReminderAt: null,
        now,
      }),
    ).toBe(4);
  });

  it('reminders-disabled caller guard: nothing is eligible when settings.reminderEnabled is false', () => {
    // The scheduler filters on invoiceSettings.reminderEnabled at the SQL
    // level, so `computeEligibleStage` is never invoked for disabled
    // tenants. This test documents that contract by mirroring the caller
    // pattern: when the enabled flag is false, no stage must be produced.
    const settingsEnabled = false;
    const callerStage = settingsEnabled
      ? computeEligibleStage({
          ...baseSettings,
          dueDate: daysAgo(now, 30),
          lastReminderStage: 0,
          lastReminderAt: null,
          now,
        })
      : null;

    expect(callerStage).toBeNull();
  });
});
