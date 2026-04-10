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
};
