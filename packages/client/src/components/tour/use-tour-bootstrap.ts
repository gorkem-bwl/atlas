import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../config/query-keys';
import { appRegistry } from '../../apps';
import { useMyAccessibleApps } from '../../hooks/use-app-permissions';
import { useTour } from './use-tour';
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
 * Colours come from each app's manifest so the stages match their dock icons.
 */
const LIFECYCLE_STAGES: FlowStage[] = [
  { appId: 'crm', color: '#f97316', labelKey: 'tour.lifecycle.stageLead', hintKey: 'tour.lifecycle.stageLeadHint' },
  { appId: 'crm', color: '#f97316', labelKey: 'tour.lifecycle.stageDeal', hintKey: 'tour.lifecycle.stageDealHint' },
  { appId: 'work', color: '#6366f1', labelKey: 'tour.lifecycle.stageProject', hintKey: 'tour.lifecycle.stageProjectHint' },
  { appId: 'invoices', color: '#0ea5e9', labelKey: 'tour.lifecycle.stageInvoice', hintKey: 'tour.lifecycle.stageInvoiceHint' },
];

/**
 * A step showing how the apps connect, rather than what one app does.
 *
 * Returns null unless at least two lifecycle stages are reachable: with one
 * stage there is no flow to show, and the step would be a worse version of
 * that app's own tour card.
 *
 * It anchors to the dock icon of its first surviving stage. The overlay
 * resolves `[data-tour-target="${appId}"]` and renders nothing when the
 * lookup fails, so the anchor must be an app the viewer can actually see.
 */
export function buildLifecycleStep(isAccessible: (appId: string) => boolean): TourStep | null {
  const stages = LIFECYCLE_STAGES.filter((stage) => isAccessible(stage.appId));
  if (stages.length < 2) return null;

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
  const appSteps = appRegistry
    .getAll()
    .filter((app) => app.tour !== undefined)
    .map(buildStep);

  // The replay path has no permission data to hand, so it gates on what is
  // registered instead. That is the same question one step removed: an app
  // absent from the registry has no dock icon to anchor to either.
  const registeredIds = new Set(appRegistry.getAll().map((app) => app.id));
  const lifecycleStep = buildLifecycleStep((appId) => registeredIds.has(appId));

  const steps: TourStep[] = lifecycleStep ? [lifecycleStep, ...appSteps] : appSteps;
  if (steps.length > 0) open(steps);
}
