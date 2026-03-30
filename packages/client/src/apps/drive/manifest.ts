import { HardDrive, Settings, Eye, File } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { DrivePage } from './page';
import { DriveGeneralPanel, DriveDisplayPanel, DriveFilesPanel } from './components/drive-settings-modal';

export const driveManifest: ClientAppManifest = {
  id: 'drive',
  name: 'Drive',
  labelKey: 'sidebar.drive',
  iconName: 'HardDrive',
  icon: HardDrive,
  color: '#64748b',
  minPlan: 'starter',
  category: 'storage',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 40,

  routes: [
    { path: '/drive', component: DrivePage },
    { path: '/drive/folder/:id', component: DrivePage },
  ],

  settingsCategory: {
    id: 'drive',
    label: 'Drive',
    icon: HardDrive,
    color: '#64748b',
    panels: [
      { id: 'general', label: 'General', icon: Settings, component: DriveGeneralPanel },
      { id: 'display', label: 'Display', icon: Eye, component: DriveDisplayPanel },
      { id: 'files', label: 'Files', icon: File, component: DriveFilesPanel },
    ],
  },
};
