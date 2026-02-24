import type { EmailCategory } from './email';

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'
  | 'in_list'
  | 'not_in_list'
  | 'exists';

export type RuleField =
  | 'from_address'
  | 'from_name'
  | 'to_address'
  | 'subject'
  | 'body_text'
  | 'gmail_labels'
  | 'has_attachments'
  | 'list_unsubscribe'
  | 'header';

export interface RuleCondition {
  field: RuleField;
  operator: RuleOperator;
  value: string | string[] | boolean;
}

export interface CategoryRule {
  id: string;
  accountId: string;
  name: string;
  category: EmailCategory;
  priority: number;
  conditions: RuleCondition[];
  isSystem: boolean;
  isEnabled: boolean;
}
