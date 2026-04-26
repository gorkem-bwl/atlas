import { Receipt, Settings, FileText } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { InvoicesPage } from './page';
import { InvoiceSettingsPanel } from './components/invoice-settings-panel';
import { InvoiceTemplatesPanel } from './components/invoice-templates-panel';

export const invoicesManifest: ClientAppManifest = {
  id: 'invoices',
  name: 'Invoices',
  labelKey: 'sidebar.invoices',
  iconName: 'Receipt',
  icon: Receipt,
  color: '#0ea5e9',
  minPlan: 'starter',
  category: 'data',
  dependencies: ['crm'],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 35,
  routes: [{ path: '/invoices', component: InvoicesPage }],
  settingsCategory: {
    id: 'invoices',
    label: 'Invoices',
    icon: Receipt,
    color: '#0ea5e9',
    panels: [
      { id: 'general', label: 'General', icon: Settings, component: InvoiceSettingsPanel, adminOnly: true },
      { id: 'templates', label: 'Invoice templates', icon: FileText, component: InvoiceTemplatesPanel, adminOnly: true },
    ],
  },
  tour: {
    variant: 'list',
    illustrationData: {
      rows: [
        { initials: 'HM', avatarColor: '#0ea5e9', primary: 'Horizon Media · INV-1042', secondary: '$4,200 · due in 7 days', badge: { label: 'Sent', tone: 'info' } },
        { initials: 'CN', avatarColor: '#10b981', primary: 'CloudNine · INV-1041', secondary: '$1,850 · paid', badge: { label: 'Paid', tone: 'success' } },
        { initials: 'NW', avatarColor: '#f59e0b', primary: 'Northwind · INV-1040', secondary: '$3,300 · 12 days late', badge: { label: 'Overdue', tone: 'danger' } },
        { initials: 'PS', avatarColor: '#ef4444', primary: 'Pinecrest · INV-1039', secondary: '$960 · draft', badge: { label: 'Draft', tone: 'neutral' } },
      ],
      fadeFrom: 2,
      collaborator: { name: 'Lina', color: '#0ea5e9', targetRowIndex: 0 },
    },
  },
};
