import invoicesRouter from './routes';
import type { ServerAppManifest } from '../../config/app-manifest.server';
import type { EntityObjectMeta } from '@atlas-platform/shared';

const objects: EntityObjectMeta[] = [
  {
    id: 'invoices',
    name: 'Invoices',
    iconName: 'Receipt',
    tableName: 'invoices',
    description: 'Invoices with line items, payment tracking, and e-Fatura support',
    standardFields: [
      { name: 'Company', slug: 'company_id', fieldType: 'relation', isRequired: true },
      { name: 'Contact', slug: 'contact_id', fieldType: 'relation', isRequired: false },
      { name: 'Deal', slug: 'deal_id', fieldType: 'relation', isRequired: false },
      { name: 'Invoice number', slug: 'invoice_number', fieldType: 'text', isRequired: true },
      { name: 'Status', slug: 'status', fieldType: 'select', isRequired: true },
      { name: 'Subtotal', slug: 'subtotal', fieldType: 'number', isRequired: true },
      { name: 'Tax percent', slug: 'tax_percent', fieldType: 'number', isRequired: false },
      { name: 'Tax amount', slug: 'tax_amount', fieldType: 'number', isRequired: false },
      { name: 'Discount percent', slug: 'discount_percent', fieldType: 'number', isRequired: false },
      { name: 'Discount amount', slug: 'discount_amount', fieldType: 'number', isRequired: false },
      { name: 'Total', slug: 'total', fieldType: 'number', isRequired: true },
      { name: 'Currency', slug: 'currency', fieldType: 'text', isRequired: true },
      { name: 'Issue date', slug: 'issue_date', fieldType: 'date', isRequired: false },
      { name: 'Due date', slug: 'due_date', fieldType: 'date', isRequired: false },
      { name: 'Notes', slug: 'notes', fieldType: 'text', isRequired: false },
    ],
    relations: [
      { targetObjectId: 'crm:companies', type: 'many-to-one', foreignKey: 'company_id' },
      { targetObjectId: 'crm:contacts', type: 'many-to-one', foreignKey: 'contact_id' },
      { targetObjectId: 'crm:deals', type: 'many-to-one', foreignKey: 'deal_id' },
      { targetObjectId: 'invoices:line_items', type: 'one-to-many' },
    ],
  },
  {
    id: 'line_items',
    name: 'Invoice line items',
    iconName: 'List',
    tableName: 'invoice_line_items',
    description: 'Individual line items on an invoice',
    standardFields: [
      { name: 'Invoice', slug: 'invoice_id', fieldType: 'relation', isRequired: true },
      { name: 'Time entry', slug: 'time_entry_id', fieldType: 'relation', isRequired: false },
      { name: 'Description', slug: 'description', fieldType: 'text', isRequired: true },
      { name: 'Quantity', slug: 'quantity', fieldType: 'number', isRequired: true },
      { name: 'Unit price', slug: 'unit_price', fieldType: 'number', isRequired: true },
      { name: 'Amount', slug: 'amount', fieldType: 'number', isRequired: true },
      { name: 'Tax rate', slug: 'tax_rate', fieldType: 'number', isRequired: false },
    ],
    relations: [
      { targetObjectId: 'invoices:invoices', type: 'many-to-one', foreignKey: 'invoice_id' },
    ],
  },
  {
    id: 'settings',
    name: 'Invoice settings',
    iconName: 'Settings',
    tableName: 'invoice_settings',
    description: 'Organization-level invoice and e-Fatura settings',
    standardFields: [
      { name: 'Invoice prefix', slug: 'invoice_prefix', fieldType: 'text', isRequired: true },
      { name: 'Next invoice number', slug: 'next_invoice_number', fieldType: 'number', isRequired: true },
      { name: 'Default currency', slug: 'default_currency', fieldType: 'text', isRequired: false },
      { name: 'Default tax rate', slug: 'default_tax_rate', fieldType: 'number', isRequired: false },
      { name: 'e-Fatura enabled', slug: 'e_fatura_enabled', fieldType: 'boolean', isRequired: false },
    ],
  },
];

export const invoicesServerManifest: ServerAppManifest = {
  id: 'invoices',
  name: 'Invoices',
  labelKey: 'sidebar.invoices',
  iconName: 'Receipt',
  color: '#f59e0b',
  minPlan: 'starter',
  category: 'data',
  dependencies: [],
  defaultEnabled: true,
  version: '1.0.0',
  router: invoicesRouter,
  routePrefix: '/invoices',
  tables: [
    'invoices',
    'invoice_line_items',
    'invoice_settings',
  ],
  objects,
};
