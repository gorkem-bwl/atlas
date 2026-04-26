import { Settings, FileSignature } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { SignPage } from './page';
import { SignGeneralPanel } from './components/settings/general-panel';

export const signManifest: ClientAppManifest = {
  id: 'sign',
  name: 'Agreements',
  labelKey: 'sidebar.sign',
  iconName: 'FileSignature',
  icon: FileSignature,
  color: '#8b5cf6',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 30,
  routes: [
    { path: '/sign-app', component: SignPage },
    { path: '/sign-app/:id', component: SignPage },
  ],
  settingsCategory: {
    id: 'sign',
    label: 'Agreements',
    icon: FileSignature,
    color: '#8b5cf6',
    panels: [
      { id: 'general', label: 'General', icon: Settings, component: SignGeneralPanel, adminOnly: true },
    ],
  },
  tour: {
    variant: 'kanban',
    illustrationData: {
      columns: [
        { label: 'Drafting', count: 2, cards: [
          { primary: 'Vendor MSA', secondary: 'Legal · 12 pages' },
        ]},
        { label: 'Awaiting signature', count: 4, cards: [
          { primary: 'Q4 services contract', secondary: 'Sales · 2 signers' },
          { primary: 'NDA — Beacon Co.', secondary: 'Sales · 1 signer' },
        ]},
        { label: 'Signed', count: 18, cards: [
          { primary: 'Lease renewal', secondary: 'Operations' },
        ]},
      ],
      draggedCard: {
        fromColumn: 1,
        toColumn: 2,
        primary: 'Vendor SOW',
        secondary: 'Procurement',
        collaborator: { name: 'Alex', color: '#8b5cf6' },
      },
    },
  },
};
