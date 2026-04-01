import driveRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';
import type { EntityObjectMeta } from '@atlasmail/shared';

const objects: EntityObjectMeta[] = [
  {
    id: 'drive_items',
    name: 'Drive items',
    iconName: 'HardDrive',
    tableName: 'drive_items',
    description: 'Files and folders stored in Drive',
    standardFields: [
      { name: 'Name', slug: 'name', fieldType: 'text', isRequired: true },
      { name: 'Type', slug: 'type', fieldType: 'select', isRequired: true },
      { name: 'Parent folder', slug: 'parent_id', fieldType: 'relation', isRequired: false },
      { name: 'Storage path', slug: 'storage_path', fieldType: 'text', isRequired: false },
      { name: 'MIME type', slug: 'mime_type', fieldType: 'text', isRequired: false },
      { name: 'Size', slug: 'size', fieldType: 'number', isRequired: false },
      { name: 'Tags', slug: 'tags', fieldType: 'multi_select', isRequired: false },
      { name: 'Is favourite', slug: 'is_favourite', fieldType: 'boolean', isRequired: true },
    ],
  },
];

export const driveServerManifest: ServerAppManifest = {
  id: 'drive',
  name: 'Drive',
  labelKey: 'sidebar.drive',
  iconName: 'HardDrive',
  color: '#64748b',
  minPlan: 'starter',
  category: 'storage',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: driveRouter,
  routePrefix: '/drive',
  tables: ['drive_items', 'drive_versions', 'drive_share_links', 'drive_activity_log', 'drive_comments'],
  objects,
};
