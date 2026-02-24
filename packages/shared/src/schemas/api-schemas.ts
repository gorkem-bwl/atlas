import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const threadQuerySchema = paginationSchema.extend({
  category: z.enum(['important', 'other', 'newsletters', 'notifications']).optional(),
  label: z.string().optional(),
  isStarred: z.coerce.boolean().optional(),
  isArchived: z.coerce.boolean().optional(),
});

export type ThreadQueryParams = z.infer<typeof threadQuerySchema>;
