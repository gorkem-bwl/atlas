import { Briefcase, Settings, Users } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { CrmPage } from './page';
import { CrmStagesPanel, CrmActivityTypesPanel, CrmGeneralPanel, CrmIntegrationsPanel } from './components/crm-settings-modal';
import { PipelineWidget } from './widgets/pipeline-widget';

export const crmManifest: ClientAppManifest = {
  id: 'crm',
  name: 'CRM',
  labelKey: 'sidebar.crm',
  iconName: 'Briefcase',
  icon: Users,
  color: '#f97316',
  minPlan: 'starter',
  category: 'data',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 10,
  routes: [{ path: '/crm', component: CrmPage }],
  widgets: [
    {
      id: 'pipeline',
      name: 'Pipeline',
      description: 'CRM pipeline value and deal count',
      iconName: 'Briefcase',
      icon: Briefcase,
      defaultSize: 'sm',
      defaultEnabled: true,
      component: PipelineWidget,
    },
  ],
  settingsCategory: {
    id: 'crm',
    label: 'CRM',
    icon: Briefcase,
    color: '#f97316',
    panels: [
      { id: 'stages', label: 'Pipeline stages', icon: Settings, component: CrmStagesPanel, adminOnly: true },
      { id: 'activity-types', label: 'Activity types', icon: Settings, component: CrmActivityTypesPanel, adminOnly: true },
      { id: 'general', label: 'General', icon: Settings, component: CrmGeneralPanel, adminOnly: true },
      { id: 'integrations', label: 'Integrations', icon: Settings, component: CrmIntegrationsPanel, adminOnly: true },
    ],
  },
  tour: {
    variant: 'list',
    illustrationData: {
      rows: [
        { initials: 'JR', avatarColor: '#a78bfa', primary: 'James Rodriguez', secondary: 'Horizon Media Group', badge: { label: 'Active', tone: 'success' } },
        { initials: 'EC', avatarColor: '#10b981', primary: 'Emily Chen', secondary: 'CloudNine Solutions', badge: { label: 'Lead', tone: 'info' } },
        { initials: 'DK', avatarColor: '#f59e0b', primary: 'David Kim', secondary: 'Northwind Logistics', badge: { label: 'Prospect', tone: 'warning' } },
        { initials: 'SP', avatarColor: '#ef4444', primary: 'Sara Park', secondary: 'Pinecrest Studio', badge: { label: 'Cold', tone: 'danger' } },
      ],
      fadeFrom: 2,
      collaborator: { name: 'Maria', color: '#6366f1', targetRowIndex: 1 },
    },
  },
};
