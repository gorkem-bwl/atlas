import { describe, it, expect, vi } from 'vitest';

// The module pulls in the app registry and React Query at import time; none of
// that is needed to exercise the pure step builder.
vi.mock('../src/lib/api-client', () => ({ api: { get: vi.fn() } }));
vi.mock('../src/hooks/use-app-permissions', () => ({ useMyAccessibleApps: vi.fn() }));
vi.mock('../src/providers/query-provider', () => ({
  queryClient: { getQueryData: () => undefined },
}));

// Stage colours are read from the registry rather than copied, so the mock
// carries the real manifest values — that link between a stage dot and its
// dock icon is what the colours are for.
const MANIFEST_COLORS: Record<string, string> = {
  crm: '#f97316',
  work: '#6366f1',
  invoices: '#0ea5e9',
};
vi.mock('../src/apps', () => ({
  appRegistry: {
    getAll: () => [],
    get: (id: string) => {
      const color = ({ crm: '#f97316', work: '#6366f1', invoices: '#0ea5e9' } as Record<string, string>)[id];
      return color ? { id, color } : undefined;
    },
  },
}));

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

  it('returns null for CRM alone, despite it owning two stages', () => {
    // Lead and deal are both CRM, so a stage COUNT of two would admit this —
    // but the step claims "each stage lives in a different app", which would
    // be untrue for that viewer, and it would sit right before CRM's own tour
    // card. The guard counts distinct apps for exactly this case.
    expect(buildLifecycleStep(only('crm'))).toBeNull();
  });

  it('renders once a second app joins CRM', () => {
    const step = buildLifecycleStep(only('crm', 'invoices'));
    expect(step).not.toBeNull();
    const stages = (step!.config as { illustrationData: { stages: { appId: string }[] } })
      .illustrationData.stages;
    expect(stages.map((s) => s.appId)).toEqual(['crm', 'crm', 'invoices']);
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

  it('takes stage colours from the app manifests, not copies of them', () => {
    // Hardcoding these would let a manifest colour change silently desync the
    // stage dot from the dock icon it points at.
    const step = buildLifecycleStep(all)!;
    const stages = (step.config as {
      illustrationData: { stages: { appId: string; color: string }[] };
    }).illustrationData.stages;
    for (const stage of stages) {
      expect(stage.color, stage.appId).toBe(MANIFEST_COLORS[stage.appId]);
    }
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
