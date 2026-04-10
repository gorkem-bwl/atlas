import tasksRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';
import type { EntityObjectMeta } from '@atlas-platform/shared';

const objects: EntityObjectMeta[] = [
  {
    id: 'tasks',
    name: 'Tasks',
    iconName: 'CheckSquare',
    tableName: 'tasks',
    description: 'Action items with priority, due dates, and project grouping',
    standardFields: [
      { name: 'Title', slug: 'title', fieldType: 'text', isRequired: true },
      { name: 'Notes', slug: 'notes', fieldType: 'text', isRequired: false },
      { name: 'Priority', slug: 'priority', fieldType: 'select', isRequired: true },
      { name: 'Due date', slug: 'due_date', fieldType: 'date', isRequired: false },
      { name: 'When', slug: 'when', fieldType: 'select', isRequired: true },
      { name: 'Project', slug: 'project_id', fieldType: 'relation', isRequired: false },
      { name: 'Tags', slug: 'tags', fieldType: 'multi_select', isRequired: false },
      { name: 'Completed at', slug: 'completed_at', fieldType: 'date', isRequired: false },
      { name: 'Status', slug: 'status', fieldType: 'select', isRequired: true },
    ],
    relations: [
      { targetObjectId: 'tasks:task_projects', type: 'many-to-one', foreignKey: 'project_id' },
    ],
  },
  {
    id: 'task_projects',
    name: 'Projects',
    iconName: 'FolderOpen',
    tableName: 'task_projects',
    description: 'Groups of related tasks',
    standardFields: [
      { name: 'Title', slug: 'title', fieldType: 'text', isRequired: true },
      { name: 'Description', slug: 'description', fieldType: 'text', isRequired: false },
      { name: 'Icon', slug: 'icon', fieldType: 'text', isRequired: false },
      { name: 'Color', slug: 'color', fieldType: 'text', isRequired: true },
    ],
    relations: [
      { targetObjectId: 'tasks:tasks', type: 'one-to-many' },
    ],
  },
  {
    id: 'task_activities',
    name: 'Task activities',
    iconName: 'Clock',
    tableName: 'task_activities',
    description: 'Audit log of changes to tasks',
    standardFields: [
      { name: 'Task', slug: 'task_id', fieldType: 'relation', isRequired: true },
      { name: 'Action', slug: 'action', fieldType: 'text', isRequired: true },
      { name: 'Field', slug: 'field', fieldType: 'text', isRequired: false },
      { name: 'Old value', slug: 'old_value', fieldType: 'text', isRequired: false },
      { name: 'New value', slug: 'new_value', fieldType: 'text', isRequired: false },
    ],
    relations: [
      { targetObjectId: 'tasks:tasks', type: 'many-to-one', foreignKey: 'task_id' },
    ],
  },
];

export const tasksServerManifest: ServerAppManifest = {
  id: 'tasks',
  name: 'Tasks',
  labelKey: 'sidebar.tasks',
  iconName: 'CheckSquare',
  color: '#6366f1',
  minPlan: 'starter',
  category: 'productivity',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: tasksRouter,
  routePrefix: '/tasks',
  tables: ['tasks', 'task_activities', 'task_projects', 'task_comments', 'task_attachments', 'task_dependencies'],
  objects,
};
