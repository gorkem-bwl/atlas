import { FolderKanban } from 'lucide-react';
import type { ClientAppManifest } from '../../config/app-manifest.client';
import { ProjectsPage } from './page';

export const projectsManifest: ClientAppManifest = {
  id: 'projects',
  name: 'Projects',
  labelKey: 'sidebar.projects',
  iconName: 'FolderKanban',
  icon: FolderKanban,
  color: '#0ea5e9',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 25,
  routes: [{ path: '/projects', component: ProjectsPage }],
};
