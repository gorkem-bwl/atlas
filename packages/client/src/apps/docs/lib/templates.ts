// ─── Page template types and constants ──────────────────────────────────

export type TemplateCategory = 'Engineering' | 'Product' | 'Design' | 'Marketing' | 'HR & People' | 'General';

export interface PageTemplate {
  name: string;
  icon: string;
  description: string;
  title: string;
  content: string;
  category: TemplateCategory;
  coverColor: string;
  tags: string[];
  previewSnippet: string;
}

export const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  Engineering: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Product: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  Design: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  Marketing: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'HR & People': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  General: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
};

export const ALL_CATEGORIES: TemplateCategory[] = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'HR & People',
  'General',
];

// Template data is split across two files to keep each under 500 lines
import { CORE_TEMPLATES } from './template-data-core';
import { EXTRA_TEMPLATES } from './template-data-extra';

export const PAGE_TEMPLATES: PageTemplate[] = [
  ...CORE_TEMPLATES,
  ...EXTRA_TEMPLATES,
];
