import docsRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';
import type { EntityObjectMeta } from '@atlasmail/shared';

const objects: EntityObjectMeta[] = [
  {
    id: 'documents',
    name: 'Documents',
    iconName: 'FileText',
    tableName: 'documents',
    description: 'Rich-text pages with nested hierarchy',
    standardFields: [
      { name: 'Title', slug: 'title', fieldType: 'text', isRequired: true },
      { name: 'Content', slug: 'content', fieldType: 'json', isRequired: false },
      { name: 'Parent', slug: 'parent_id', fieldType: 'relation', isRequired: false },
      { name: 'Icon', slug: 'icon', fieldType: 'text', isRequired: false },
      { name: 'Cover image', slug: 'cover_image', fieldType: 'url', isRequired: false },
    ],
    relations: [
      { targetObjectId: 'docs:document_versions', type: 'one-to-many' },
      { targetObjectId: 'docs:document_comments', type: 'one-to-many' },
    ],
  },
  {
    id: 'document_versions',
    name: 'Document versions',
    iconName: 'Clock',
    tableName: 'document_versions',
    description: 'Point-in-time snapshots of document content',
    standardFields: [
      { name: 'Document', slug: 'document_id', fieldType: 'relation', isRequired: true },
      { name: 'Title', slug: 'title', fieldType: 'text', isRequired: true },
      { name: 'Content', slug: 'content', fieldType: 'json', isRequired: false },
    ],
    relations: [
      { targetObjectId: 'docs:documents', type: 'many-to-one', foreignKey: 'document_id' },
    ],
  },
  {
    id: 'document_comments',
    name: 'Document comments',
    iconName: 'MessageSquare',
    tableName: 'document_comments',
    description: 'Inline comments and discussion threads on documents',
    standardFields: [
      { name: 'Document', slug: 'document_id', fieldType: 'relation', isRequired: true },
      { name: 'Content', slug: 'content', fieldType: 'text', isRequired: true },
      { name: 'Parent', slug: 'parent_id', fieldType: 'relation', isRequired: false },
      { name: 'Is resolved', slug: 'is_resolved', fieldType: 'boolean', isRequired: true },
    ],
    relations: [
      { targetObjectId: 'docs:documents', type: 'many-to-one', foreignKey: 'document_id' },
    ],
  },
  {
    id: 'document_links',
    name: 'Document links',
    iconName: 'Link2',
    tableName: 'document_links',
    description: 'Bidirectional links between documents',
    standardFields: [
      { name: 'Source document', slug: 'source_doc_id', fieldType: 'relation', isRequired: true },
      { name: 'Target document', slug: 'target_doc_id', fieldType: 'relation', isRequired: true },
    ],
    relations: [
      { targetObjectId: 'docs:documents', type: 'many-to-one', foreignKey: 'source_doc_id' },
      { targetObjectId: 'docs:documents', type: 'many-to-one', foreignKey: 'target_doc_id' },
    ],
  },
];

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
  objects,
};
