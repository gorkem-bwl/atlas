import type { Email, EmailCategory } from '../types/email';
import type { CategoryRule, RuleCondition } from '../types/category';

const NEWSLETTER_DOMAINS = [
  'substack.com', 'buttondown.email', 'mailchimp.com', 'constantcontact.com',
  'sendgrid.net', 'mailgun.org', 'campaign-archive.com',
];

const NOTIFICATION_DOMAINS = [
  'github.com', 'gitlab.com', 'bitbucket.org', 'jira.atlassian.com',
  'notify.slack.com', 'noreply.google.com', 'facebookmail.com',
  'amazonses.com', 'linkedin.com', 'no-reply.accounts.google.com',
];

const NOTIFICATION_PATTERNS = [
  /^noreply@/i, /^no-reply@/i, /^notifications?@/i, /^alerts?@/i,
  /^mailer-daemon@/i, /^automated@/i, /^donotreply@/i,
];

export function categorizeEmail(email: Email, rules: CategoryRule[], contactEmails: string[]): EmailCategory {
  // 1. User rules first (highest priority)
  const userRules = rules
    .filter((r) => !r.isSystem && r.isEnabled)
    .sort((a, b) => b.priority - a.priority);

  for (const rule of userRules) {
    if (evaluateRule(email, rule.conditions)) return rule.category;
  }

  // 2. Gmail category labels
  const labels = email.gmailLabels || [];
  if (labels.includes('CATEGORY_PROMOTIONS') || labels.includes('CATEGORY_UPDATES')) return 'newsletters';
  if (labels.includes('CATEGORY_SOCIAL') || labels.includes('CATEGORY_FORUMS')) return 'notifications';

  // 3. Newsletter heuristics (before contacts — noreply senders aren't real contacts)
  const domain = email.fromAddress.split('@')[1]?.toLowerCase() || '';
  if (NEWSLETTER_DOMAINS.some((d) => domain.includes(d))) return 'newsletters';

  // 4. Notification heuristics (before contacts — automated senders aren't real contacts)
  if (NOTIFICATION_DOMAINS.some((d) => domain.includes(d))) return 'notifications';
  if (NOTIFICATION_PATTERNS.some((p) => p.test(email.fromAddress))) return 'notifications';

  // 5. Gmail IMPORTANT / PERSONAL label or known contact → important
  if (labels.includes('CATEGORY_PERSONAL') || labels.includes('IMPORTANT')) return 'important';
  if (contactEmails.includes(email.fromAddress.toLowerCase())) return 'important';

  // 6. Default
  return 'other';
}

function evaluateRule(email: Email, conditions: RuleCondition[]): boolean {
  return conditions.every((condition) => evaluateCondition(email, condition));
}

function evaluateCondition(email: Email, condition: RuleCondition): boolean {
  const value = getFieldValue(email, condition.field);
  const target = condition.value;

  switch (condition.operator) {
    case 'equals': return value === target;
    case 'not_equals': return value !== target;
    case 'contains': return typeof value === 'string' && typeof target === 'string' && value.toLowerCase().includes(target.toLowerCase());
    case 'not_contains': return typeof value === 'string' && typeof target === 'string' && !value.toLowerCase().includes(target.toLowerCase());
    case 'starts_with': return typeof value === 'string' && typeof target === 'string' && value.toLowerCase().startsWith(target.toLowerCase());
    case 'ends_with': return typeof value === 'string' && typeof target === 'string' && value.toLowerCase().endsWith(target.toLowerCase());
    case 'matches_regex': return typeof value === 'string' && typeof target === 'string' && new RegExp(target, 'i').test(value);
    case 'in_list': return Array.isArray(target) && typeof value === 'string' && target.includes(value);
    case 'exists': return value !== null && value !== undefined && value !== '';
    default: return false;
  }
}

function getFieldValue(email: Email, field: string): string | boolean | null {
  switch (field) {
    case 'from_address': return email.fromAddress;
    case 'from_name': return email.fromName;
    case 'subject': return email.subject;
    case 'body_text': return email.bodyText;
    case 'has_attachments': return email.attachments?.length > 0;
    default: return null;
  }
}
