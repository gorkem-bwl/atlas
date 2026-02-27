export type TableFieldType =
  | 'text'
  | 'number'
  | 'checkbox'
  | 'singleSelect'
  | 'multiSelect'
  | 'date'
  | 'url'
  | 'email'
  | 'currency'
  | 'phone'
  | 'rating'
  | 'percent'
  | 'longText'
  | 'attachment';

export interface TableColumn {
  id: string;
  name: string;
  type: TableFieldType;
  width?: number;
  options?: string[];
  required?: boolean;
}

export interface TableRow {
  _id: string;
  _createdAt: string;
  [columnId: string]: unknown;
}

export interface TableViewConfig {
  activeView: 'grid' | 'kanban';
  kanbanGroupByColumnId?: string;
  sorts?: Array<{ columnId: string; direction: 'asc' | 'desc' }>;
  filters?: Array<{ columnId: string; operator: string; value: unknown }>;
  hiddenColumns?: string[];
}

export interface Spreadsheet {
  id: string;
  accountId: string;
  userId: string;
  title: string;
  columns: TableColumn[];
  rows: TableRow[];
  viewConfig: TableViewConfig;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpreadsheetInput {
  title?: string;
  columns?: TableColumn[];
  rows?: TableRow[];
  viewConfig?: TableViewConfig;
}

export interface UpdateSpreadsheetInput {
  title?: string;
  columns?: TableColumn[];
  rows?: TableRow[];
  viewConfig?: TableViewConfig;
  isArchived?: boolean;
}
