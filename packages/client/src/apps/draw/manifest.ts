import { Pencil, Palette, Download } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { DrawIcon } from '../../components/icons/app-icons';
import { DrawPage } from './page';
import { DrawCanvasPanel, DrawExportPanel } from './components/draw-settings-modal';

export const drawManifest: ClientAppManifest = {
  id: 'draw',
  name: 'Draw',
  labelKey: 'sidebar.draw',
  iconName: 'Pencil',
  icon: DrawIcon,
  color: '#e06c9f',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 80,

  routes: [
    { path: '/draw', component: DrawPage },
    { path: '/draw/:id', component: DrawPage },
  ],

  settingsCategory: {
    id: 'draw',
    label: 'Draw',
    icon: Pencil,
    color: '#e06c9f',
    panels: [
      { id: 'canvas', label: 'Canvas', icon: Palette, component: DrawCanvasPanel, adminOnly: true },
      { id: 'export', label: 'Export', icon: Download, component: DrawExportPanel, adminOnly: true },
    ],
  },
};
