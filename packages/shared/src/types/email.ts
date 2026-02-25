export interface Email {
  id: string;
  accountId: string;
  threadId: string;
  gmailMessageId: string;
  messageIdHeader: string | null;
  inReplyTo: string | null;
  referencesHeader: string | null;
  fromAddress: string;
  fromName: string | null;
  toAddresses: EmailAddress[];
  ccAddresses: EmailAddress[];
  bccAddresses: EmailAddress[];
  replyTo: string | null;
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  gmailLabels: string[];
  isUnread: boolean;
  isStarred: boolean;
  isDraft: boolean;
  internalDate: string;
  receivedAt: string | null;
  sizeEstimate: number | null;
  attachments: Attachment[];
  listUnsubscribe: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface Attachment {
  id: string;
  emailId: string;
  gmailAttachmentId: string | null;
  filename: string;
  mimeType: string;
  size: number;
  contentId: string | null;
  isInline: boolean;
}

export interface Thread {
  id: string;
  accountId: string;
  gmailThreadId: string;
  subject: string | null;
  snippet: string | null;
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  lastMessageAt: string;
  category: EmailCategory;
  labels: string[];
  isStarred: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isSpam: boolean;
  emails?: Email[];
  createdAt: string;
  updatedAt: string;
}

export type EmailCategory = 'all' | 'important' | 'other' | 'newsletters' | 'notifications';
