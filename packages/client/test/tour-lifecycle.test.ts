import { describe, it, expect, vi } from 'vitest';

// The module pulls in the app registry and React Query at import time; none of
// that is needed to exercise the pure step builder.
vi.mock('../src/lib/api-client', () => ({ api: { get: vi.fn() } }));
vi.mock('../src/apps', () => ({ appRegistry: { getAll: () => [] } }));
vi.mock('../src/hooks/use-app-permissions', () => ({ useMyAccessibleApps: vi.fn() }));

const { buildLifecycleStep } = await import('../src/components/tour/use-tour-bootstrap');

// The lifecycle step answers "how do these apps fit together?" — the gap in
// #25 that the per-app tour cards never covered. What makes it non-trivial is
// that it spans three apps a tenant may not all have, and the tour overlay
// anchors each step to a dock icon via [data-tour-target="${appId}"],
// rendering NOTHING when that lookup fails. So the step has to be honest
// about which stages the viewer can actually reach.

const all = () => true;
const none = () => false;
const only = (...ids: string[]) => (appId: string) => ids.includes(appId);

describe('buildLifecycleStep', () => {
  it('shows the full lifecycle when every app is accessible', () => {
    const step = buildLifecycleStep(all);
    expect(step).not.toBeNull();
    expect(step!.config.variant).toBe('flow');

    const stages = (step!.config as { illustrationData: { stages: { appId: string }[] } })
      .illustrationData.stages;
    expect(stages.map((s) => s.appId)).toEqual(['crm', 'crm', 'work', 'invoices']);
  });

  it('orders stages the way a customer moves through them', () => {
    const step = buildLifecycleStep(all);
    const stages = (step!.config as { illustrationData: { stages: { labelKey: string }[] } })
      .illustrationData.stages;
    expect(stages.map((s) => s.labelKey)).toEqual([
      'tour.lifecycle.stageLead',
      'tour.lifecycle.stageDeal',
      'tour.lifecycle.stageProject',
      'tour.lifecycle.stageInvoice',
    ]);
  });

  it('drops stages for apps the viewer cannot reach', () => {
    // Without Invoices, the flow still runs lead → deal → project. Showing an
    // invoice stage would point at a dock icon that is not rendered.
    const step = buildLifecycleStep(only('crm', 'work'));
    const stages = (step!.config as { illustrationData: { stages: { appId: string }[] } })
      .illustrationData.stages;
    expect(stages.map((s) => s.appId)).toEqual(['crm', 'crm', 'work']);
  });

  it('returns null when nothing is accessible', () => {
    expect(buildLifecycleStep(none)).toBeNull();
  });

  it('returns null when only one app is accessible', () => {
    // Work alone leaves a single stage. There is no flow to show, and the
    // step would be a worse version of that app's own tour card.
    expect(buildLifecycleStep(only('work'))).toBeNull();
    expect(buildLifecycleStep(only('invoices'))).toBeNull();
  });

  it('still renders for CRM alone, which owns two stages', () => {
    // Lead and deal are both CRM, so the flow is meaningful even without the
    // other apps — this is the case the "at least two stages" rule exists for.
    const step = buildLifecycleStep(only('crm'));
    expect(step).not.toBeNull();
    const stages = (step!.config as { illustrationData: { stages: { appId: string }[] } })
      .illustrationData.stages;
    expect(stages).toHaveLength(2);
  });

  it('anchors to the first surviving stage, not a hardcoded app', () => {
    // The overlay renders nothing if the anchor has no dock icon, so a
    // CRM-less tenant must anchor somewhere it can actually see.
    expect(buildLifecycleStep(all)!.appId).toBe('crm');
    expect(buildLifecycleStep(only('work', 'invoices'))!.appId).toBe('work');
  });

  it('colours the anchor to match its stage', () => {
    expect(buildLifecycleStep(all)!.appColor).toBe('#f97316'); // CRM orange
    expect(buildLifecycleStep(only('work', 'invoices'))!.appColor).toBe('#6366f1'); // Work indigo
  });

  it('uses i18n keys throughout, never literal copy', () => {
    // Every user-visible string has to be translatable; a hardcoded label
    // would silently ship English to all five locales.
    const step = buildLifecycleStep(all)!;
    expect(step.titleKey).toBe('tour.lifecycle.title');
    expect(step.descriptionKey).toBe('tour.lifecycle.description');

    const stages = (step.config as {
      illustrationData: { stages: { labelKey: string; hintKey: string }[] };
    }).illustrationData.stages;
    for (const stage of stages) {
      expect(stage.labelKey).toMatch(/^tour\.lifecycle\./);
      expect(stage.hintKey).toMatch(/^tour\.lifecycle\./);
    }
  });
});

describe('lifecycle copy is translated everywhere', () => {
  it('resolves every key in all five locales', async () => {
    const locales = ['en', 'tr', 'de', 'fr', 'it'] as const;
    const step = buildLifecycleStep(all)!;
    const stages = (step.config as {
      illustrationData: { stages: { labelKey: string; hintKey: string }[] };
    }).illustrationData.stages;

    const keys = [
      step.titleKey,
      step.descriptionKey,
      ...stages.flatMap((s) => [s.labelKey, s.hintKey]),
    ];

    for (const locale of locales) {
      const bundle = (await import(`../src/i18n/locales/${locale}.json`)).default;
      for (const key of keys) {
        const value = key.split('.').reduce<unknown>(
          (acc, part) => (acc as Record<string, unknown>)?.[part],
          bundle,
        );
        expect(value, `${locale} missing ${key}`).toBeTypeOf('string');
        expect((value as string).length, `${locale} empty ${key}`).toBeGreaterThan(0);
      }
    }
  });
});
