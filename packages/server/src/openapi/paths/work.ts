import { z } from 'zod';
import { register, envelope, Uuid, IsoDateTime, IsoDate } from '../_helpers';
import { TASK_STATUS_VALUES } from '@atlas-platform/shared';

const TAG = 'Work';

const Task = z.object({
  id: Uuid,
  tenantId: Uuid,
  userId: Uuid,
  projectId: Uuid.nullable(),
  isPrivate: z.boolean(),
  title: z.string(),
  notes: z.string().nullable(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  type: z.enum(['task', 'heading']),
  headingId: Uuid.nullable(),
  status: z.enum(TASK_STATUS_VALUES),
  when: z.enum(['inbox', 'today', 'evening', 'anytime', 'someday', 'upcoming']),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
  dueDate: z.string().nullable(),
  completedAt: IsoDateTime.nullable(),
  tags: z.array(z.string()),
  recurrenceRule: z.string().nullable(),
  recurrenceParentId: Uuid.nullable(),
  sourceEmailId: z.string().nullable(),
  sourceEmailSubject: z.string().nullable(),
  assigneeId: Uuid.nullable(),
  lastReminderAt: IsoDateTime.nullable(),
  sortOrder: z.number().int(),
  isArchived: z.boolean(),
  visibility: z.enum(['private', 'team']),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

const Project = z.object({
  id: Uuid,
  companyId: Uuid.nullable(),
  name: z.string(),
  description: z.string().nullable(),
  billable: z.boolean(),
  status: z.enum(['active', 'paused', 'completed', 'archived']),
  estimatedHours: z.number().nullable(),
  estimatedAmount: z.number().nullable(),
  startDate: IsoDateTime.nullable(),
  endDate: IsoDateTime.nullable(),
  color: z.string().nullable(),
  isArchived: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

const TimeEntry = z.object({
  id: Uuid,
  projectId: Uuid,
  userId: Uuid,
  durationMinutes: z.number().int(),
  workDate: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  billable: z.boolean(),
  billed: z.boolean(),
  paid: z.boolean(),
  locked: z.boolean(),
  notes: z.string().nullable(),
  taskDescription: z.string().nullable(),
  tags: z.array(z.string()),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

const Comment = z.object({
  id: Uuid,
  taskId: Uuid,
  userId: Uuid,
  body: z.string(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

const ProjectMember = z.object({
  id: Uuid,
  projectId: Uuid,
  userId: Uuid,
  hourlyRate: z.number().nullable(),
});

// ============================================================
// Settings
// ============================================================
const WorkSettings = z.object({
  id: Uuid,
  tenantId: Uuid,
  defaultHourlyRate: z.number(),
  companyName: z.string().nullable(),
  companyAddress: z.string().nullable(),
  companyLogo: z.string().nullable(),
  weekStartDay: z.enum(['monday', 'sunday', 'saturday']),
  defaultProjectVisibility: z.enum(['private', 'team']),
  defaultBillable: z.boolean(),
  timeRounding: z.number().int().openapi({ description: 'Rounding in minutes (0 = off)' }),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({ method: 'get', path: '/work/settings', tags: [TAG], summary: 'Get Work app settings',
  response: envelope(WorkSettings) });
register({ method: 'patch', path: '/work/settings', tags: [TAG], summary: 'Update Work app settings',
  body: WorkSettings.partial(), response: envelope(WorkSettings) });

// ============================================================
// Tasks
// ============================================================
register({ method: 'get', path: '/work/tasks', tags: [TAG], summary: 'List tasks',
  query: z.object({
    projectId: Uuid.optional(),
    status: Task.shape.status.optional(),
    when: Task.shape.when.optional(),
    assigneeId: Uuid.optional(),
  }),
  response: envelope(z.object({ tasks: z.array(Task) })) });
register({ method: 'post', path: '/work/tasks', tags: [TAG], summary: 'Create a task',
  body: Task.omit({ id: true, tenantId: true, userId: true, createdAt: true, updatedAt: true, completedAt: true, lastReminderAt: true }).partial().extend({ title: z.string() }),
  response: envelope(Task) });
register({ method: 'get', path: '/work/tasks/search', tags: [TAG], summary: 'Search tasks',
  query: z.object({ q: z.string().min(1) }),
  response: envelope(z.array(Task)) });
register({ method: 'get', path: '/work/tasks/counts', tags: [TAG], summary: 'Get task counts by bucket',
  response: envelope(z.object({
    inbox: z.number().int(),
    today: z.number().int(),
    upcoming: z.number().int(),
    anytime: z.number().int(),
    someday: z.number().int(),
    logbook: z.number().int(),
    total: z.number().int(),
    assignedToMe: z.number().int(),
  })) });
register({ method: 'get', path: '/work/tasks/blocked', tags: [TAG], summary: 'Get IDs of tasks blocked by dependencies',
  response: envelope(z.array(Uuid)) });
register({ method: 'get', path: '/work/tasks/:id', tags: [TAG], summary: 'Get a task',
  params: z.object({ id: Uuid }), response: envelope(Task) });
register({ method: 'patch', path: '/work/tasks/:id', tags: [TAG], summary: 'Update a task',
  params: z.object({ id: Uuid }), body: Task.partial(), concurrency: true, response: envelope(Task) });
register({ method: 'patch', path: '/work/tasks/:id/visibility', tags: [TAG], summary: 'Toggle task visibility',
  params: z.object({ id: Uuid }), body: z.object({ visibility: Task.shape.visibility }) });
register({ method: 'delete', path: '/work/tasks/:id', tags: [TAG], summary: 'Delete a task',
  params: z.object({ id: Uuid }) });

// Subtasks
register({ method: 'get', path: '/work/tasks/:id/subtasks', tags: [TAG], summary: 'List subtasks of a task',
  params: z.object({ id: Uuid }), response: envelope(z.array(Task)) });
register({ method: 'post', path: '/work/tasks/:id/subtasks', tags: [TAG], summary: 'Create a subtask',
  params: z.object({ id: Uuid }), body: z.object({ title: z.string() }), response: envelope(Task) });
register({ method: 'patch', path: '/work/tasks/:id/subtasks/:subtaskId', tags: [TAG], summary: 'Update a subtask',
  params: z.object({ id: Uuid, subtaskId: Uuid }), body: Task.partial(), response: envelope(Task) });
register({ method: 'delete', path: '/work/tasks/:id/subtasks/:subtaskId', tags: [TAG], summary: 'Delete a subtask',
  params: z.object({ id: Uuid, subtaskId: Uuid }) });
register({ method: 'post', path: '/work/tasks/:id/subtasks/reorder', tags: [TAG], summary: 'Reorder subtasks',
  params: z.object({ id: Uuid }), body: z.object({ subtaskIds: z.array(Uuid) }) });

// Activity + comments
register({ method: 'get', path: '/work/tasks/:id/activities', tags: [TAG], summary: 'List task activity log',
  params: z.object({ id: Uuid }), response: envelope(z.array(z.record(z.string(), z.unknown()))) });
register({ method: 'get', path: '/work/tasks/:taskId/comments', tags: [TAG], summary: 'List task comments',
  params: z.object({ taskId: Uuid }), response: envelope(z.array(Comment)) });
register({ method: 'post', path: '/work/tasks/:taskId/comments', tags: [TAG], summary: 'Add a task comment',
  params: z.object({ taskId: Uuid }), body: z.object({ body: z.string() }), response: envelope(Comment) });
register({ method: 'delete', path: '/work/tasks/:taskId/comments/:commentId', tags: [TAG], summary: 'Delete a task comment',
  params: z.object({ taskId: Uuid, commentId: Uuid }) });

// ============================================================
// Projects
// ============================================================
register({ method: 'get', path: '/work/projects', tags: [TAG], summary: 'List projects',
  query: z.object({ status: Project.shape.status.optional() }),
  response: envelope(z.object({ projects: z.array(Project) })) });
register({ method: 'post', path: '/work/projects', tags: [TAG], summary: 'Create a project',
  body: Project.omit({ id: true, createdAt: true, updatedAt: true, isArchived: true, sortOrder: true }).partial().extend({ name: z.string() }),
  response: envelope(Project) });
register({ method: 'get', path: '/work/projects/:id', tags: [TAG], summary: 'Get a project (with company name and aggregate time/billing)',
  params: z.object({ id: Uuid }),
  response: envelope(Project.extend({
    companyName: z.string().nullable(),
    totalTrackedMinutes: z.number().int(),
    totalBilledAmount: z.number(),
  })) });
register({ method: 'patch', path: '/work/projects/:id', tags: [TAG], summary: 'Update a project',
  params: z.object({ id: Uuid }), body: Project.partial(), concurrency: true, response: envelope(Project) });
register({ method: 'delete', path: '/work/projects/:id', tags: [TAG], summary: 'Delete a project',
  params: z.object({ id: Uuid }) });

// Project members — identified by the join row id (memberId), not userId
register({ method: 'get', path: '/work/projects/:id/members', tags: [TAG], summary: 'List project members',
  params: z.object({ id: Uuid }), response: envelope(z.array(ProjectMember)) });
register({ method: 'post', path: '/work/projects/:id/members', tags: [TAG], summary: 'Add a project member',
  params: z.object({ id: Uuid }), body: z.object({ userId: Uuid, hourlyRate: z.number().optional() }),
  response: envelope(ProjectMember) });
register({ method: 'patch', path: '/work/projects/:id/members/:memberId/rate', tags: [TAG], summary: 'Update a project member’s hourly rate',
  params: z.object({ id: Uuid, memberId: Uuid }),
  body: z.object({ hourlyRate: z.number() }),
  response: envelope(ProjectMember) });
register({ method: 'delete', path: '/work/projects/:id/members/:memberId', tags: [TAG], summary: 'Remove a project member',
  params: z.object({ id: Uuid, memberId: Uuid }) });

// Project files (attached drive items)
register({ method: 'get', path: '/work/projects/:id/files', tags: [TAG], summary: 'List drive files attached to a project',
  params: z.object({ id: Uuid }),
  response: envelope(z.array(z.record(z.string(), z.unknown()))) });
register({ method: 'post', path: '/work/projects/:id/files', tags: [TAG], summary: 'Attach a drive file to a project',
  params: z.object({ id: Uuid }),
  body: z.object({ driveItemId: Uuid }) });
register({ method: 'delete', path: '/work/projects/:id/files/:driveItemId', tags: [TAG], summary: 'Detach a drive file from a project',
  params: z.object({ id: Uuid, driveItemId: Uuid }) });
register({ method: 'get', path: '/work/projects/:id/financials', tags: [TAG], summary: 'Get project financials roll-up',
  params: z.object({ id: Uuid }),
  response: envelope(z.record(z.string(), z.unknown())) });
register({ method: 'get', path: '/work/projects/dashboard', tags: [TAG], summary: 'Projects dashboard KPIs',
  response: envelope(z.record(z.string(), z.unknown())) });

// Project-scoped time entries
register({ method: 'get', path: '/work/projects/:id/time-entries', tags: [TAG], summary: 'List time entries on a project',
  params: z.object({ id: Uuid }),
  response: envelope(z.array(TimeEntry)) });
register({ method: 'post', path: '/work/projects/:id/time-entries', tags: [TAG], summary: 'Create a project time entry',
  params: z.object({ id: Uuid }),
  body: TimeEntry.omit({ id: true, projectId: true, createdAt: true, updatedAt: true, billed: true, paid: true, locked: true }).partial()
    .extend({ workDate: z.string(), durationMinutes: z.number().int() }),
  response: envelope(TimeEntry) });
register({ method: 'patch', path: '/work/projects/:id/time-entries/:entryId', tags: [TAG], summary: 'Update a project time entry',
  params: z.object({ id: Uuid, entryId: Uuid }), body: TimeEntry.partial(),
  concurrency: true, response: envelope(TimeEntry) });
register({ method: 'delete', path: '/work/projects/:id/time-entries/:entryId', tags: [TAG], summary: 'Delete a project time entry',
  params: z.object({ id: Uuid, entryId: Uuid }) });

// Time billing helpers
register({ method: 'post', path: '/work/projects/time-billing/preview', tags: [TAG], summary: 'Preview invoice line items from unbilled time',
  body: z.object({ projectId: Uuid, from: IsoDate.optional(), to: IsoDate.optional() }),
  response: envelope(z.record(z.string(), z.unknown())) });
register({ method: 'post', path: '/work/projects/time-billing/populate', tags: [TAG], summary: 'Populate an invoice with unbilled time entries',
  body: z.object({ projectId: Uuid, invoiceId: Uuid, from: IsoDate.optional(), to: IsoDate.optional() }) });

// Task attachments
register({ method: 'get', path: '/work/tasks/:taskId/attachments', tags: [TAG], summary: 'List attachments on a task',
  params: z.object({ taskId: Uuid }),
  response: envelope(z.array(z.record(z.string(), z.unknown()))) });
register({ method: 'post', path: '/work/tasks/:taskId/attachments', tags: [TAG], summary: 'Upload an attachment to a task (multipart/form-data)',
  params: z.object({ taskId: Uuid }),
  response: envelope(z.record(z.string(), z.unknown())) });
register({ method: 'get', path: '/work/tasks/:taskId/attachments/:attachmentId/download', tags: [TAG], summary: 'Download a task attachment',
  params: z.object({ taskId: Uuid, attachmentId: Uuid }),
  extraResponses: { 200: { description: 'File binary', schema: z.string().openapi({ format: 'binary' }) } } });
register({ method: 'delete', path: '/work/tasks/:taskId/attachments/:attachmentId', tags: [TAG], summary: 'Delete a task attachment',
  params: z.object({ taskId: Uuid, attachmentId: Uuid }) });

// Task dependencies (blockers)
register({ method: 'get', path: '/work/tasks/:taskId/dependencies', tags: [TAG], summary: 'List tasks that block this task',
  params: z.object({ taskId: Uuid }),
  response: envelope(z.array(Task)) });
register({ method: 'post', path: '/work/tasks/:taskId/dependencies', tags: [TAG], summary: 'Add a blocker task',
  params: z.object({ taskId: Uuid }),
  body: z.object({ blockerTaskId: Uuid }) });
register({ method: 'delete', path: '/work/tasks/:taskId/dependencies/:blockerTaskId', tags: [TAG], summary: 'Remove a blocker',
  params: z.object({ taskId: Uuid, blockerTaskId: Uuid }) });

// Task templates
const TaskTemplate = z.object({
  id: Uuid, tenantId: Uuid, name: z.string(),
  taskDefaults: z.record(z.string(), z.unknown()),
  subtasks: z.array(z.record(z.string(), z.unknown())),
  createdAt: IsoDateTime, updatedAt: IsoDateTime,
});
register({ method: 'get', path: '/work/templates', tags: [TAG], summary: 'List task templates',
  response: envelope(z.array(TaskTemplate)) });
register({ method: 'post', path: '/work/templates', tags: [TAG], summary: 'Create a task template',
  body: z.object({ name: z.string(), taskDefaults: z.record(z.string(), z.unknown()).optional(), subtasks: z.array(z.record(z.string(), z.unknown())).optional() }),
  response: envelope(TaskTemplate) });
register({ method: 'patch', path: '/work/templates/:templateId', tags: [TAG], summary: 'Update a task template',
  params: z.object({ templateId: Uuid }),
  body: TaskTemplate.partial(),
  response: envelope(TaskTemplate) });
register({ method: 'delete', path: '/work/templates/:templateId', tags: [TAG], summary: 'Delete a task template',
  params: z.object({ templateId: Uuid }) });
register({ method: 'post', path: '/work/templates/:templateId/use', tags: [TAG], summary: 'Create a task from a template',
  params: z.object({ templateId: Uuid }),
  body: z.object({ projectId: Uuid.optional() }),
  response: envelope(Task) });

// Time entries
register({ method: 'get', path: '/work/time-entries', tags: [TAG], summary: 'List time entries',
  query: z.object({
    projectId: Uuid.optional(),
    userId: Uuid.optional(),
    from: IsoDate.optional(),
    to: IsoDate.optional(),
  }),
  response: envelope(z.array(TimeEntry)) });
register({ method: 'post', path: '/work/time-entries', tags: [TAG], summary: 'Create a time entry',
  body: TimeEntry.omit({ id: true, createdAt: true, updatedAt: true, billed: true, paid: true, locked: true }).partial()
    .extend({ projectId: Uuid, workDate: z.string(), durationMinutes: z.number().int() }),
  response: envelope(TimeEntry) });
register({ method: 'patch', path: '/work/time-entries/:id', tags: [TAG], summary: 'Update a time entry',
  params: z.object({ id: Uuid }), body: TimeEntry.partial(), response: envelope(TimeEntry) });
register({ method: 'delete', path: '/work/time-entries/:id', tags: [TAG], summary: 'Delete a time entry',
  params: z.object({ id: Uuid }) });
