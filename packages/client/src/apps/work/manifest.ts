import { Briefcase, Settings, Eye, Zap, FolderKanban, Tag } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { WorkPage } from './page';
import { WorkGeneralPanel } from './components/settings/general-panel';
import { WorkAppearancePanel } from './components/settings/appearance-panel';
import { WorkBehaviorPanel } from './components/settings/behavior-panel';
import { WorkStatusesPanel } from './components/settings/statuses-panel';

export const workManifest: ClientAppManifest = {
  id: 'work',
  name: 'Work',
  labelKey: 'sidebar.work',
  iconName: 'Briefcase',
  icon: FolderKanban,
  color: '#6366f1',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 25,

  routes: [
    { path: '/work', component: WorkPage },
  ],

  settingsCategory: {
    id: 'work',
    label: 'Work',
    icon: Briefcase,
    color: '#6366f1',
    panels: [
      { id: 'general', label: 'General', icon: Settings, component: WorkGeneralPanel, adminOnly: true },
      { id: 'statuses', label: 'Task statuses', icon: Tag, component: WorkStatusesPanel, adminOnly: true },
      { id: 'appearance', label: 'Appearance', icon: Eye, component: WorkAppearancePanel },
      { id: 'behavior', label: 'Behavior', icon: Zap, component: WorkBehaviorPanel },
    ],
  },
  tour: {
    variant: 'kanban',
    illustrationData: {
      columns: [
        { label: 'Backlog', count: 6, cards: [
          { primary: 'Audit homepage copy', secondary: 'Marketing' },
          { primary: 'Migrate logger', secondary: 'Platform' },
        ]},
        { label: 'In progress', count: 3, cards: [
          { primary: 'Q4 roadmap deck', secondary: 'Strategy' },
          { primary: 'Tour overlay', secondary: 'Engineering' },
        ]},
        { label: 'Done', count: 11, cards: [
          { primary: 'Launch invoice templates', secondary: 'Billing' },
        ]},
      ],
      draggedCard: {
        fromColumn: 0,
        toColumn: 1,
        primary: 'Refresh sidebar icons',
        secondary: 'Design',
        collaborator: { name: 'Tom', color: '#6366f1' },
      },
    },
  },
};
