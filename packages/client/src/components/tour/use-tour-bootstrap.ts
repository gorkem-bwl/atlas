import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../config/query-keys';
import { appRegistry } from '../../apps';
import { useMyAccessibleApps } from '../../hooks/use-app-permissions';
import { useTour } from './use-tour';
import { queryClient } from '../../providers/query-provider';
import type { FlowStage, TourStep } from './tour-types';

interface TourStatusResponse {
  tourCompletedAt: string | null;
}

function buildStep(app: ReturnType<typeof appRegistry.getAll>[number]): TourStep {
  return {
    appId: app.id,
    appColor: app.color,
    config: app.tour!,
    titleKey: `${app.id}.tour.title`,
    descriptionKey: `${app.id}.tour.description`,
  };
}

/**
 * The customer lifecycle, in the order a customer actually moves through it.
 *
 * Colour is resolved from each app's manifest at build time rather than copied
 * here, so a stage dot cannot drift away from the dock icon it refers to —
 * that link is the whole reason the dots are coloured. The fallback only
 * applies to an app missing from the registry, which is already filtered out
 * by the time a stage is rendered.
 */
const LIFECYCLE_STAGE_KEYS: Array<Pick<FlowStage, 'appId' | 'labelKey' | 'hintKey'>> = [
  { appId: 'crm', labelKey: 'tour.lifecycle.stageLead', hintKey: 'tour.lifecycle.stageLeadHint' },
  { appId: 'crm', labelKey: 'tour.lifecycle.stageDeal', hintKey: 'tour.lifecycle.stageDealHint' },
  { appId: 'work', labelKey: 'tour.lifecycle.stageProject', hintKey: 'tour.lifecycle.stageProjectHint' },
  { appId: 'invoices', labelKey: 'tour.lifecycle.stageInvoice', hintKey: 'tour.lifecycle.stageInvoiceHint' },
];

function lifecycleStages(): FlowStage[] {
  return LIFECYCLE_STAGE_KEYS.map((stage) => ({
    ...stage,
    color: appRegistry.get(stage.appId)?.color ?? 'var(--color-accent-primary)',
  }));
}

/**
 * A step showing how the apps connect, rather than what one app does.
 *
 * Returns null unless at least two DISTINCT apps are reachable. Counting
 * stages instead would admit a CRM-only tenant — lead and deal are both CRM —
 * and the step would then sit immediately before CRM's own tour card telling
 * that viewer "each stage lives in a different app", which is untrue for them.
 * The step exists to show how apps connect; with one app there is nothing to
 * connect.
 *
 * It anchors to the dock icon of its first surviving stage. The overlay
 * resolves `[data-tour-target="${appId}"]` and renders nothing when the
 * lookup fails, so the anchor must be an app the viewer can actually see.
 */
export function buildLifecycleStep(isAccessible: (appId: string) => boolean): TourStep | null {
  const stages = lifecycleStages().filter((stage) => isAccessible(stage.appId));
  if (new Set(stages.map((stage) => stage.appId)).size < 2) return null;

  return {
    appId: stages[0].appId,
    appColor: stages[0].color,
    config: { variant: 'flow', illustrationData: { stages } },
    titleKey: 'tour.lifecycle.title',
    descriptionKey: 'tour.lifecycle.description',
  };
}

export function useTourBootstrap() {
  const { open, isOpen } = useTour();
  const accessibleQuery = useMyAccessibleApps();
  const tourStatusQuery = useQuery({
    queryKey: queryKeys.tour.status,
    queryFn: async () => {
      const { data } = await api.get('/system/tour');
      return data.data as TourStatusResponse;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isOpen) return;
    if (!tourStatusQuery.data || !accessibleQuery.data) return;
    if (tourStatusQuery.data.tourCompletedAt !== null) return;

    const accessibleAppIds = accessibleQuery.data.appIds;
    const tourApps = appRegistry
      .getAll()
      .filter((app) => app.tour !== undefined)
      .filter((app) => {
        if (accessibleAppIds === '__all__') return true;
        return Array.isArray(accessibleAppIds) && accessibleAppIds.includes(app.id);
      });

    if (tourApps.length === 0) return;

    const isAccessible = (appId: string) =>
      accessibleAppIds === '__all__' ||
      (Array.isArray(accessibleAppIds) && accessibleAppIds.includes(appId));

    // Lead with how the apps connect, then walk through them one at a time.
    // The per-app cards make more sense once the shape of the whole is known.
    const lifecycleStep = buildLifecycleStep(isAccessible);
    const steps: TourStep[] = lifecycleStep
      ? [lifecycleStep, ...tourApps.map(buildStep)]
      : tourApps.map(buildStep);

    // Defer to after first paint so the dock renders before the overlay drops in
    const id = window.setTimeout(() => open(steps), 150);
    return () => window.clearTimeout(id);
  }, [tourStatusQuery.data, accessibleQuery.data, isOpen, open]);
}

/** Replay path used by the user-menu "Take the tour" entry. Ignores tourCompletedAt. */
export function replayTour() {
  const { open } = useTour.getState();

  // Gate on the SAME data the dock filters by, not on the registry. The
  // registry is a static module list, so crm/work/invoices are always in it,
  // while the dock renders only the tenant's accessible apps. Anchoring a
  // step to an app with no dock icon makes tour-overlay compute no position
  // and render nothing — and since the lifecycle step goes first, that would
  // leave "Take the tour" opening an invisible tour with no way forward.
  //
  // Read from cache rather than a hook: this is called from a menu handler,
  // not a component. An empty cache falls back to allowing everything, which
  // matches the pre-existing per-app behaviour.
  const cached = queryClient.getQueryData<{ appIds: string[] | '__all__' }>(
    queryKeys.permissions.myApps,
  );
  const accessibleAppIds = cached?.appIds;
  const isAccessible = (appId: string) =>
    accessibleAppIds === undefined ||
    accessibleAppIds === '__all__' ||
    accessibleAppIds.includes(appId);

  const appSteps = appRegistry
    .getAll()
    .filter((app) => app.tour !== undefined)
    .filter((app) => isAccessible(app.id))
    .map(buildStep);

  const lifecycleStep = buildLifecycleStep(isAccessible);

  const steps: TourStep[] = lifecycleStep ? [lifecycleStep, ...appSteps] : appSteps;
  if (steps.length > 0) open(steps);
}
