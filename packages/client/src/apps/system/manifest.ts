import { Cpu, MemoryStick, Settings2 } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { SystemPage } from './page';
import { CpuWidget } from './widgets/cpu-widget';
import { MemoryWidget } from './widgets/memory-widget';

export const systemManifest: ClientAppManifest = {
  id: 'system',
  name: 'System',
  labelKey: 'sidebar.system',
  iconName: 'Monitor',
  icon: Settings2,
  color: '#6b7280',
  minPlan: 'starter',
  category: 'other',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 90,
  routes: [{ path: '/system', component: SystemPage }],
  widgets: [
    {
      id: 'cpu-usage',
      name: 'CPU usage',
      description: 'Live CPU utilization gauge',
      iconName: 'Cpu',
      icon: Cpu,
      defaultSize: 'sm',
      refreshInterval: 10_000,
      defaultEnabled: true,
      component: CpuWidget,
    },
    {
      id: 'memory-usage',
      name: 'Memory usage',
      description: 'Live memory utilization bar',
      iconName: 'MemoryStick',
      icon: MemoryStick,
      defaultSize: 'sm',
      refreshInterval: 10_000,
      defaultEnabled: true,
      component: MemoryWidget,
    },
  ],
  tour: {
    variant: 'list',
    illustrationData: {
      rows: [
        { initials: 'PM', avatarColor: '#13715B', primary: 'Permissions', secondary: 'Who can see what — per app' },
        { initials: 'BL', avatarColor: '#0ea5e9', primary: 'Billing', secondary: 'Plan · Atlas Team · 24 seats' },
        { initials: 'AU', avatarColor: '#f59e0b', primary: 'Audit log', secondary: '142 events this week' },
        { initials: 'IN', avatarColor: '#a78bfa', primary: 'Integrations', secondary: '6 connected services' },
      ],
      fadeFrom: 3,
    },
  },
};
