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

export type TourVariant = 'list' | 'kanban' | 'activity' | 'custom';

export type TourConfig =
  | { variant: 'list'; illustrationData: ListData }
  | { variant: 'kanban'; illustrationData: KanbanData }
  | { variant: 'activity'; illustrationData: ActivityData }
  | { variant: 'custom'; component: ComponentType };

export interface TourStep {
  appId: string;
  appColor: string;
  config: TourConfig;
  titleKey: string;       // e.g. 'crm.tour.title'
  descriptionKey: string; // e.g. 'crm.tour.description'
}
