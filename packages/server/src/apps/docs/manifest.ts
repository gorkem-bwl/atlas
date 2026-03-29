import docsRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';

export const docsServerManifest: ServerAppManifest = {
  id: 'docs',
  name: 'Write',
  labelKey: 'sidebar.docs',
  iconName: 'FileText',
  color: '#c4856c',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: docsRouter,
  routePrefix: '/docs',
  tables: ['documents', 'document_versions', 'document_comments', 'document_links'],
};
