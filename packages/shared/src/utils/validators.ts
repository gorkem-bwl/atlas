import { z } from 'zod';

export const loginSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(500),
  from: z.string().optional(),
  to: z.string().optional(),
  after: z.string().optional(),
  before: z.string().optional(),
  hasAttachment: z.boolean().optional(),
  category: z.string().optional(),
});

export const composeSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  subject: z.string().max(500).optional(),
  bodyHtml: z.string(),
  bodyText: z.string().optional(),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),
});

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  density: z.enum(['compact', 'default', 'comfortable']).optional(),
  readingPane: z.enum(['right', 'bottom', 'hidden']).optional(),
  autoAdvance: z.enum(['next', 'previous', 'list']).optional(),
  desktopNotifications: z.boolean().optional(),
  notificationSound: z.boolean().optional(),
  signatureHtml: z.string().nullable().optional(),
});
