import tablesRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';
import type { EntityObjectMeta } from '@atlasmail/shared';

const objects: EntityObjectMeta[] = [
  {
    id: 'spreadsheets',
    name: 'Spreadsheets',
    iconName: 'Table2',
    tableName: 'spreadsheets',
    description: 'Airtable-style databases with custom columns and rows',
    standardFields: [
      { name: 'Title', slug: 'title', fieldType: 'text', isRequired: true },
      { name: 'Columns', slug: 'columns', fieldType: 'json', isRequired: true },
      { name: 'Rows', slug: 'rows', fieldType: 'json', isRequired: true },
      { name: 'View config', slug: 'view_config', fieldType: 'json', isRequired: true },
      { name: 'Color', slug: 'color', fieldType: 'text', isRequired: false },
      { name: 'Icon', slug: 'icon', fieldType: 'text', isRequired: false },
      { name: 'Guide', slug: 'guide', fieldType: 'text', isRequired: false },
    ],
  },
];

export const tablesServerManifest: ServerAppManifest = {
  id: 'tables',
  name: 'Tables',
  labelKey: 'sidebar.tables',
  iconName: 'Table2',
  color: '#2d8a6e',
  minPlan: 'starter',
  category: 'data',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: tablesRouter,
  routePrefix: '/tables',
  tables: ['spreadsheets', 'spreadsheet_columns', 'spreadsheet_rows'],
  objects,
};
