import drawingsRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';
import type { EntityObjectMeta } from '@atlas-platform/shared';

const objects: EntityObjectMeta[] = [
  {
    id: 'drawings',
    name: 'Drawings',
    iconName: 'Pencil',
    tableName: 'drawings',
    description: 'Excalidraw-based diagrams and sketches',
    standardFields: [
      { name: 'Title', slug: 'title', fieldType: 'text', isRequired: true },
      { name: 'Content', slug: 'content', fieldType: 'json', isRequired: false },
      { name: 'Thumbnail URL', slug: 'thumbnail_url', fieldType: 'url', isRequired: false },
    ],
  },
];

export const drawServerManifest: ServerAppManifest = {
  id: 'draw',
  name: 'Draw',
  labelKey: 'sidebar.draw',
  iconName: 'Pencil',
  color: '#e06c9f',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: drawingsRouter,
  routePrefix: '/drawings',
  tables: ['drawings'],
  objects,
};
