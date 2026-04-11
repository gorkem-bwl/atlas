import type { ClientAppManifest } from '../../config/app-manifest.client';
import { ProjectsIcon } from '../../components/icons/app-icons';
import { ProjectsPage } from './page';

export const projectsManifest: ClientAppManifest = {
  id: 'projects',
  name: 'Projects',
  labelKey: 'sidebar.projects',
  iconName: 'FolderKanban',
  icon: ProjectsIcon,
  color: '#0ea5e9',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  sidebarOrder: 25,
  routes: [{ path: '/projects', component: ProjectsPage }],
};
