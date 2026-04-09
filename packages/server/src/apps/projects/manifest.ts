import projectsRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';
import type { EntityObjectMeta } from '@atlasmail/shared';

const objects: EntityObjectMeta[] = [
  {
    id: 'projects',
    name: 'Projects',
    iconName: 'FolderKanban',
    tableName: 'project_projects',
    description: 'Billable and non-billable projects with time tracking',
    standardFields: [
      { name: 'Name', slug: 'name', fieldType: 'text', isRequired: true },
      { name: 'Company', slug: 'company_id', fieldType: 'relation', isRequired: false },
      { name: 'Description', slug: 'description', fieldType: 'text', isRequired: false },
      { name: 'Billable', slug: 'billable', fieldType: 'boolean', isRequired: true },
      { name: 'Status', slug: 'status', fieldType: 'select', isRequired: true },
      { name: 'Estimated hours', slug: 'estimated_hours', fieldType: 'number', isRequired: false },
      { name: 'Estimated amount', slug: 'estimated_amount', fieldType: 'number', isRequired: false },
      { name: 'Start date', slug: 'start_date', fieldType: 'date', isRequired: false },
      { name: 'End date', slug: 'end_date', fieldType: 'date', isRequired: false },
      { name: 'Color', slug: 'color', fieldType: 'text', isRequired: false },
    ],
    relations: [
      { targetObjectId: 'crm:companies', type: 'many-to-one', foreignKey: 'company_id' },
      { targetObjectId: 'projects:time_entries', type: 'one-to-many' },
      { targetObjectId: 'projects:members', type: 'one-to-many' },
    ],
  },
  {
    id: 'members',
    name: 'Project members',
    iconName: 'Users',
    tableName: 'project_members',
    description: 'Team members assigned to projects with hourly rates',
    standardFields: [
      { name: 'User', slug: 'user_id', fieldType: 'relation', isRequired: true },
      { name: 'Project', slug: 'project_id', fieldType: 'relation', isRequired: true },
      { name: 'Hourly rate', slug: 'hourly_rate', fieldType: 'number', isRequired: false },
      { name: 'Role', slug: 'role', fieldType: 'select', isRequired: true },
    ],
    relations: [
      { targetObjectId: 'projects:projects', type: 'many-to-one', foreignKey: 'project_id' },
    ],
  },
  {
    id: 'time_entries',
    name: 'Time entries',
    iconName: 'Clock',
    tableName: 'project_time_entries',
    description: 'Tracked time entries for project work',
    standardFields: [
      { name: 'Project', slug: 'project_id', fieldType: 'relation', isRequired: true },
      { name: 'Duration (min)', slug: 'duration_minutes', fieldType: 'number', isRequired: true },
      { name: 'Work date', slug: 'work_date', fieldType: 'date', isRequired: true },
      { name: 'Start time', slug: 'start_time', fieldType: 'text', isRequired: false },
      { name: 'End time', slug: 'end_time', fieldType: 'text', isRequired: false },
      { name: 'Billable', slug: 'billable', fieldType: 'boolean', isRequired: true },
      { name: 'Billed', slug: 'billed', fieldType: 'boolean', isRequired: true },
      { name: 'Locked', slug: 'locked', fieldType: 'boolean', isRequired: true },
      { name: 'Notes', slug: 'notes', fieldType: 'text', isRequired: false },
      { name: 'Task description', slug: 'task_description', fieldType: 'text', isRequired: false },
    ],
    relations: [
      { targetObjectId: 'projects:projects', type: 'many-to-one', foreignKey: 'project_id' },
    ],
  },
  {
    id: 'settings',
    name: 'Project settings',
    iconName: 'Settings',
    tableName: 'project_settings',
    description: 'Organization-level project settings',
    standardFields: [
      { name: 'Default hourly rate', slug: 'default_hourly_rate', fieldType: 'number', isRequired: true },
      { name: 'Company name', slug: 'company_name', fieldType: 'text', isRequired: false },
      { name: 'Company address', slug: 'company_address', fieldType: 'text', isRequired: false },
    ],
  },
];

export const projectsServerManifest: ServerAppManifest = {
  id: 'projects',
  name: 'Projects',
  labelKey: 'sidebar.projects',
  iconName: 'FolderKanban',
  color: '#0ea5e9',
  minPlan: 'starter',
  category: 'data',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: projectsRouter,
  routePrefix: '/projects',
  tables: [
    'project_projects',
    'project_members',
    'project_time_entries',
    'project_settings',
  ],
  objects,
};
