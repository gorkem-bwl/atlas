import { FileText, Type, Rocket } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { DocsPage } from './page';
import { DocsEditorPanel, DocsStartupPanel } from './components/doc-settings-modal';

export const docsManifest: ClientAppManifest = {
  id: 'docs',
  name: 'Write',
  labelKey: 'sidebar.docs',
  iconName: 'FileText',
  icon: FileText,
  color: '#c4856c',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 70,

  routes: [
    { path: '/docs', component: DocsPage },
    { path: '/docs/:id', component: DocsPage },
  ],

  settingsCategory: {
    id: 'documents',
    label: 'Write',
    icon: FileText,
    color: '#c4856c',
    panels: [
      { id: 'editor', label: 'Editor', icon: Type, component: DocsEditorPanel },
      { id: 'startup', label: 'Startup', icon: Rocket, component: DocsStartupPanel },
    ],
  },
};
