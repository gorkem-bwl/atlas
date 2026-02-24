# Part 5: Rule-Based Email Categorization

AtlasMail sorts incoming emails into four categories: Important, Other,
Newsletters, and Notifications. This replaces Gmail's tab system with a more
configurable, local-first approach.

---

## 5.1 Category Definitions

| Category        | Purpose                                     | Icon     |
|-----------------|---------------------------------------------|----------|
| Important       | Emails from real people you communicate with | shield   |
| Other           | Everything else not matched by other rules   | inbox    |
| Newsletters     | Mailing lists, marketing, digests           | newspaper|
| Notifications   | Automated notifications (GitHub, Stripe...) | bell     |

---

## 5.2 Categorization Engine

The categorizer lives in `packages/shared/src/utils/categorizer.ts` so it runs
identically on the server (Node.js) and in Electron (main process). The web
client does not categorize — it trusts the server's categorization.

### Rule evaluation order:

1. **User-defined rules** (highest priority) — evaluated first, sorted by
   `priority` descending.
2. **System rules** — built-in heuristics, evaluated in a fixed order.
3. **Default** — if no rule matches, the email goes to "Other".

```typescript
// packages/shared/src/utils/categorizer.ts

import type { Email, CategoryRule, Category } from '../types';

export function categorizeEmail(
  email: Email,
  userRules: CategoryRule[],
  contactEmails: Set<string>  // emails the user has corresponded with
): Category {
  // Phase 1: User-defined rules (highest priority)
  for (const rule of userRules.filter(r => r.is_enabled)) {
    if (evaluateRule(rule, email)) {
      return rule.category as Category;
    }
  }

  // Phase 2: System heuristics
  return applySystemHeuristics(email, contactEmails);
}

function applySystemHeuristics(
  email: Email,
  contactEmails: Set<string>
): Category {
  const headers = email;
  const from = email.from_address.toLowerCase();
  const fromDomain = from.split('@')[1];

  // ── NEWSLETTERS ──────────────────────────────────────────────
  // Check List-Unsubscribe header (strongest signal for newsletters)
  if (hasListUnsubscribe(email)) {
    // But only if it's not from a known contact
    if (!contactEmails.has(from)) {
      return 'newsletters';
    }
  }

  // Check Gmail's own CATEGORY_PROMOTIONS or CATEGORY_UPDATES labels
  if (email.gmail_labels?.includes('CATEGORY_PROMOTIONS')) {
    return 'newsletters';
  }

  // Known newsletter platforms
  const newsletterDomains = [
    'substack.com', 'mailchimp.com', 'convertkit.com',
    'beehiiv.com', 'buttondown.email', 'revue.email',
    'sendinblue.com', 'mailgun.com', 'sendgrid.net',
  ];
  if (newsletterDomains.some(d => fromDomain?.endsWith(d))) {
    return 'newsletters';
  }

  // Bulk mail indicators
  if (email.from_address.includes('noreply') ||
      email.from_address.includes('no-reply') ||
      email.from_address.includes('newsletter') ||
      email.from_address.includes('digest')) {
    // Could be notification OR newsletter — check for notification signals
    if (isNotificationSender(fromDomain)) {
      return 'notifications';
    }
    return 'newsletters';
  }

  // ── NOTIFICATIONS ───────────────────────────────────────────
  if (email.gmail_labels?.includes('CATEGORY_UPDATES') ||
      email.gmail_labels?.includes('CATEGORY_SOCIAL')) {
    return 'notifications';
  }

  // Known notification senders
  if (isNotificationSender(fromDomain)) {
    return 'notifications';
  }

  // Automated email patterns
  const notificationSubjectPatterns = [
    /^\[.+\]/,                          // [GitHub] ..., [JIRA] ...
    /^re:\s*\[/i,                       // Re: [Slack] ...
    /invited you to/i,
    /shared .+ with you/i,
    /assigned to you/i,
    /mentioned you/i,
    /commented on/i,
    /new (sign-?in|login)/i,
    /password (reset|changed)/i,
    /verification code/i,
    /receipt for/i,
    /payment (received|confirmed)/i,
    /order (confirmed|shipped|delivered)/i,
  ];
  if (notificationSubjectPatterns.some(p => p.test(email.subject || ''))) {
    return 'notifications';
  }

  // ── IMPORTANT ───────────────────────────────────────────────
  // Emails from people you've emailed before
  if (contactEmails.has(from)) {
    return 'important';
  }

  // Direct emails (not to a list, not bulk)
  const toAddresses = JSON.parse(email.to_addresses || '[]');
  if (toAddresses.length <= 3 && !hasListUnsubscribe(email)) {
    // Small recipient list + no list headers = likely personal
    return 'important';
  }

  // ── DEFAULT ─────────────────────────────────────────────────
  return 'other';
}

function isNotificationSender(domain: string | undefined): boolean {
  if (!domain) return false;
  const notificationDomains = [
    'github.com', 'gitlab.com', 'bitbucket.org',
    'linear.app', 'notion.so', 'figma.com',
    'slack.com', 'discord.com',
    'stripe.com', 'paypal.com',
    'vercel.com', 'netlify.com', 'heroku.com',
    'aws.amazon.com', 'cloud.google.com',
    'jira.atlassian.com', 'trello.com',
    'zoom.us', 'calendly.com',
    'sentry.io', 'datadog.com', 'pagerduty.com',
    'intercom.io', 'zendesk.com',
    'dropbox.com', 'drive.google.com',
    'linkedin.com', 'twitter.com', 'facebook.com',
  ];
  return notificationDomains.some(d => domain.endsWith(d));
}

function hasListUnsubscribe(email: Email): boolean {
  // The List-Unsubscribe header is stored during Gmail message parsing.
  // In our schema, we extract it and store it as a boolean flag or
  // check the raw headers if available.
  // For the Gmail API, we can check the headers array:
  return email.gmail_labels?.includes('CATEGORY_PROMOTIONS') ||
         email.gmail_labels?.includes('CATEGORY_FORUMS') ||
         (email as any)._has_list_unsubscribe === true;
}
```

---

## 5.3 Rule Condition Schema

User-defined rules use a JSON condition format:

```typescript
interface RuleCondition {
  field: 'from_address' | 'from_name' | 'to_address' | 'subject' |
         'body_text' | 'labels' | 'has_attachment' | 'domain';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' |
            'matches_regex' | 'not_contains' | 'not_equals' |
            'is_true' | 'is_false';
  value: string;
}

interface CategoryRule {
  id: string;
  name: string;
  category: Category;
  priority: number;
  conditions: RuleCondition[];  // All conditions must match (AND logic)
  is_enabled: boolean;
}
```

### Example rules:

```json
[
  {
    "name": "Work emails",
    "category": "important",
    "priority": 100,
    "conditions": [
      {"field": "domain", "operator": "equals", "value": "mycompany.com"}
    ]
  },
  {
    "name": "GitHub notifications",
    "category": "notifications",
    "priority": 90,
    "conditions": [
      {"field": "from_address", "operator": "contains", "value": "@github.com"},
      {"field": "subject", "operator": "starts_with", "value": "["}
    ]
  },
  {
    "name": "Promotional emails",
    "category": "newsletters",
    "priority": 80,
    "conditions": [
      {"field": "from_address", "operator": "contains", "value": "marketing"}
    ]
  }
]
```

---

## 5.4 Rule Evaluation

```typescript
function evaluateRule(rule: CategoryRule, email: Email): boolean {
  // All conditions must match (AND logic)
  return rule.conditions.every(condition => evaluateCondition(condition, email));
}

function evaluateCondition(condition: RuleCondition, email: Email): boolean {
  let fieldValue: string;

  switch (condition.field) {
    case 'from_address':
      fieldValue = email.from_address || '';
      break;
    case 'from_name':
      fieldValue = email.from_name || '';
      break;
    case 'subject':
      fieldValue = email.subject || '';
      break;
    case 'domain':
      fieldValue = (email.from_address || '').split('@')[1] || '';
      break;
    case 'to_address':
      fieldValue = JSON.stringify(email.to_addresses || []);
      break;
    case 'body_text':
      fieldValue = email.body_text || '';
      break;
    case 'has_attachment':
      fieldValue = String(email.has_attachments || false);
      break;
    default:
      return false;
  }

  const target = condition.value;
  const lower = fieldValue.toLowerCase();
  const targetLower = target.toLowerCase();

  switch (condition.operator) {
    case 'equals':
      return lower === targetLower;
    case 'contains':
      return lower.includes(targetLower);
    case 'starts_with':
      return lower.startsWith(targetLower);
    case 'ends_with':
      return lower.endsWith(targetLower);
    case 'not_contains':
      return !lower.includes(targetLower);
    case 'not_equals':
      return lower !== targetLower;
    case 'matches_regex':
      try {
        return new RegExp(target, 'i').test(fieldValue);
      } catch {
        return false;
      }
    case 'is_true':
      return fieldValue === 'true';
    case 'is_false':
      return fieldValue === 'false';
    default:
      return false;
  }
}
```

---

## 5.5 Categorization During Sync

During sync, every new thread is categorized:

```typescript
// In sync.service.ts processMessageBatch():

// 1. Load user rules (cached in memory, refreshed every 5 minutes)
const rules = await getCachedRules(accountId);

// 2. Load contact set (emails the user has sent to)
const contactEmails = await getCachedContacts(accountId);

// 3. Categorize based on the newest message in the thread
const category = categorizeEmail(newestMessage, rules, contactEmails);

// 4. Assign category to thread
await updateThreadCategory(threadId, category);
```

### Re-categorization triggers:
- When user updates their rules, all threads are re-categorized in a background
  job (batched, ~1000 threads per second).
- When a user manually moves a thread to a different category, we learn from
  that action by optionally creating a rule suggestion (v2 feature).

---

## 5.6 Contact-Based Importance

The "Important" category relies heavily on the contacts table. Contacts are
built from the user's sent mail:

```typescript
async function buildContactsFromSentMail(accountId: string): Promise<void> {
  const gmail = createGmailClient(account);

  // Fetch sent messages
  const sentMessages = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['SENT'],
    maxResults: 500,
  });

  // Extract all "To" addresses and upsert into contacts table
  for (const msg of sentMessages.data.messages || []) {
    const full = await gmail.users.messages.get({
      userId: 'me', id: msg.id!, format: 'metadata',
      metadataHeaders: ['To', 'Cc'],
    });

    const toHeader = full.data.payload?.headers?.find(h => h.name === 'To');
    if (toHeader?.value) {
      const addresses = parseAddressList(toHeader.value);
      for (const addr of addresses) {
        await upsertContact(accountId, addr.email, addr.name);
      }
    }
  }
}
```

This runs during full sync and is incrementally updated whenever the user
sends a new email through AtlasMail.
