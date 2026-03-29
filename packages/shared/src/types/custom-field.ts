// ─── Custom Fields (JSONB Properties Pattern) ──────────────────────

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'url'
  | 'relation';

export interface CustomFieldDefinition {
  id: string;
  tenantId: string | null;
  appId: string;
  recordType: string;
  name: string;
  slug: string;
  fieldType: CustomFieldType;
  options: Record<string, unknown>;
  isRequired: boolean;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
