import type { ComponentType } from 'react';

export type BadgeTone = 'success' | 'info' | 'warning' | 'neutral' | 'danger';

export interface ListRow {
  initials: string;
  avatarColor: string;
  primary: string;
  secondary: string;
  badge?: { label: string; tone: BadgeTone };
}

export interface ListData {
  rows: ListRow[];
  fadeFrom: number;
  collaborator?: { name: string; color: string; targetRowIndex: number };
}

export interface KanbanCard {
  primary: string;
  secondary: string;
}

export interface KanbanColumn {
  label: string;
  count: number;
  cards: KanbanCard[];
}

export interface KanbanData {
  columns: KanbanColumn[];
  draggedCard?: {
    fromColumn: number;
    toColumn: number;
    primary: string;
    secondary: string;
    collaborator?: { name: string; color: string };
  };
}

export interface ActivityEvent {
  text: string;
  timestamp: string;
  isLive?: boolean;
}

export interface ActivityData {
  contact: {
    initials: string;
    avatarColor: string;
    name: string;
    meta: string;
    badge?: { label: string; tone: BadgeTone };
  };
  events: ActivityEvent[];
}

/**
 * One stage of the customer lifecycle, as shown by the flow illustration.
 *
 * `appId` is what makes a stage skippable: the lifecycle spans three apps and
 * a tenant may not have all of them enabled, so stages the viewer cannot
 * reach are dropped rather than pointing at a dock icon that is not there.
 */
export interface FlowStage {
  appId: string;
  color: string;
  /** i18n key for the stage name, e.g. 'tour.lifecycle.stageLead'. */
  labelKey: string;
  /** i18n key for the one-line "what happens here", e.g. 'tour.lifecycle.stageLeadHint'. */
  hintKey: string;
}

export interface FlowData {
  stages: FlowStage[];
}

export type TourVariant = 'list' | 'kanban' | 'activity' | 'flow' | 'custom';

export type TourConfig =
  | { variant: 'list'; illustrationData: ListData }
  | { variant: 'kanban'; illustrationData: KanbanData }
  | { variant: 'activity'; illustrationData: ActivityData }
  | { variant: 'flow'; illustrationData: FlowData }
  | { variant: 'custom'; component: ComponentType };

export interface TourStep {
  appId: string;
  appColor: string;
  config: TourConfig;
  titleKey: string;       // e.g. 'crm.tour.title'
  descriptionKey: string; // e.g. 'crm.tour.description'
}
