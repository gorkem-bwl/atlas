import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  pictureUrl: text('picture_url'),
  provider: text('provider').notNull().default('google'),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
  historyId: integer('history_id'),
  lastFullSync: timestamp('last_full_sync', { withTimezone: true }),
  lastSync: timestamp('last_sync', { withTimezone: true }),
  syncStatus: text('sync_status').notNull().default('idle'),
  syncError: text('sync_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_accounts_provider').on(table.provider, table.providerId),
]);

export const threads = pgTable('threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  gmailThreadId: text('gmail_thread_id').notNull(),
  subject: text('subject'),
  snippet: text('snippet'),
  messageCount: integer('message_count').notNull().default(0),
  unreadCount: integer('unread_count').notNull().default(0),
  hasAttachments: boolean('has_attachments').notNull().default(false),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull(),
  category: text('category').notNull().default('other'),
  labels: jsonb('labels').notNull().default([]),
  isStarred: boolean('is_starred').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  isTrashed: boolean('is_trashed').notNull().default(false),
  isSpam: boolean('is_spam').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_threads_account_gmail').on(table.accountId, table.gmailThreadId),
  index('idx_threads_account_category').on(table.accountId, table.category),
  index('idx_threads_last_message').on(table.accountId, table.lastMessageAt),
]);

export const emails = pgTable('emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  threadId: uuid('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
  gmailMessageId: text('gmail_message_id').notNull(),
  messageIdHeader: text('message_id_header'),
  inReplyTo: text('in_reply_to'),
  referencesHeader: text('references_header'),
  fromAddress: text('from_address').notNull(),
  fromName: text('from_name'),
  toAddresses: jsonb('to_addresses').notNull().default([]),
  ccAddresses: jsonb('cc_addresses').notNull().default([]),
  bccAddresses: jsonb('bcc_addresses').notNull().default([]),
  replyTo: text('reply_to'),
  subject: text('subject'),
  snippet: text('snippet'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  gmailLabels: jsonb('gmail_labels').notNull().default([]),
  isUnread: boolean('is_unread').notNull().default(true),
  isStarred: boolean('is_starred').notNull().default(false),
  isDraft: boolean('is_draft').notNull().default(false),
  internalDate: timestamp('internal_date', { withTimezone: true }).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  sizeEstimate: integer('size_estimate'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_emails_account_gmail').on(table.accountId, table.gmailMessageId),
  index('idx_emails_thread').on(table.threadId, table.internalDate),
  index('idx_emails_account_date').on(table.accountId, table.internalDate),
]);

export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  emailId: uuid('email_id').notNull().references(() => emails.id, { onDelete: 'cascade' }),
  gmailAttachmentId: text('gmail_attachment_id'),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  contentId: text('content_id'),
  isInline: boolean('is_inline').notNull().default(false),
  storageUrl: text('storage_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_attachments_email').on(table.emailId),
]);

export const categoryRules = pgTable('category_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  priority: integer('priority').notNull().default(0),
  conditions: jsonb('conditions').notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_category_rules_account').on(table.accountId, table.priority),
]);

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }).unique(),
  theme: text('theme').notNull().default('system'),
  density: text('density').notNull().default('default'),
  shortcutsPreset: text('shortcuts_preset').notNull().default('superhuman'),
  customShortcuts: jsonb('custom_shortcuts').notNull().default({}),
  autoAdvance: text('auto_advance').notNull().default('next'),
  readingPane: text('reading_pane').notNull().default('right'),
  desktopNotifications: boolean('desktop_notifications').notNull().default(true),
  notificationSound: boolean('notification_sound').notNull().default(false),
  signatureHtml: text('signature_html'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  frequency: integer('frequency').notNull().default(1),
  lastContacted: timestamp('last_contacted', { withTimezone: true }),
}, (table) => [
  uniqueIndex('idx_contacts_account_email').on(table.accountId, table.email),
  index('idx_contacts_account_freq').on(table.accountId, table.frequency),
]);
