import { OpenAPIRegistry, OpenApiGeneratorV31, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const openApiRegistry = new OpenAPIRegistry();

openApiRegistry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// ---------- Envelopes ----------
const EnvelopeError = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
});

function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({ success: z.literal(true), data });
}

const OkEnvelope = z.object({ success: z.literal(true) });

// ---------- Reusable primitives ----------
const Uuid = z.string().uuid();
const IsoDateTime = z.string().datetime();
const IsoDate = z.string().date();

const UnauthorizedResp = {
  description: 'Unauthorized',
  content: { 'application/json': { schema: EnvelopeError } },
};
const NotFoundResp = {
  description: 'Not found',
  content: { 'application/json': { schema: EnvelopeError } },
};
const ConflictResp = {
  description: 'Stale resource — reload and retry',
  content: {
    'application/json': {
      schema: EnvelopeError.extend({ code: z.literal('STALE_RESOURCE') }),
    },
  },
};

// ---------- Helpers to reduce boilerplate ----------
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface RouteDef {
  method: Method;
  path: string;
  tags: string[];
  summary: string;
  public?: boolean;
  params?: z.AnyZodObject;
  query?: z.AnyZodObject;
  body?: z.ZodTypeAny;
  response?: z.ZodTypeAny;
  concurrency?: boolean;
  extraResponses?: Record<number, { description: string; schema?: z.ZodTypeAny }>;
}

function register(def: RouteDef) {
  const responses: Record<number, { description: string; content?: any }> = {};
  const okSchema = def.response ?? OkEnvelope;
  responses[200] = {
    description: 'Success',
    content: { 'application/json': { schema: okSchema } },
  };
  if (!def.public) responses[401] = UnauthorizedResp;
  if (def.path.includes('/:')) responses[404] = NotFoundResp;
  if (def.concurrency) responses[409] = ConflictResp;
  if (def.extraResponses) {
    for (const [code, r] of Object.entries(def.extraResponses)) {
      responses[Number(code)] = {
        description: r.description,
        content: r.schema ? { 'application/json': { schema: r.schema } } : undefined,
      };
    }
  }

  // Convert Express-style :param to OpenAPI {param}
  const openApiPath = def.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

  const request: any = {};
  if (def.params) request.params = def.params;
  if (def.query) request.query = def.query;
  if (def.body) {
    request.body = { content: { 'application/json': { schema: def.body } } };
  }

  openApiRegistry.registerPath({
    method: def.method,
    path: openApiPath,
    tags: def.tags,
    summary: def.summary,
    security: def.public ? undefined : [{ bearerAuth: [] }],
    request: Object.keys(request).length ? request : undefined,
    responses,
  });
}

// ---------- Common schemas ----------
const User = z.object({
  id: Uuid,
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: IsoDateTime,
});

// ============================================================
// Authentication
// ============================================================
register({
  method: 'get',
  path: '/auth/setup-status',
  tags: ['Authentication'],
  summary: 'Check if first-run setup is complete',
  public: true,
  response: envelope(z.object({ setupComplete: z.boolean() })),
});

register({
  method: 'post',
  path: '/auth/setup',
  tags: ['Authentication'],
  summary: 'Complete first-run setup (create initial admin + tenant)',
  public: true,
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
    organizationName: z.string().min(1),
  }),
  response: envelope(z.object({ token: z.string(), refreshToken: z.string(), user: User })),
});

register({
  method: 'post',
  path: '/auth/login',
  tags: ['Authentication'],
  summary: 'Log in with email + password',
  public: true,
  body: z.object({
    email: z.string().email().openapi({ example: 'gorkem@example.com' }),
    password: z.string().min(1),
  }),
  response: envelope(z.object({ token: z.string(), refreshToken: z.string(), user: User })),
});

register({
  method: 'post',
  path: '/auth/refresh',
  tags: ['Authentication'],
  summary: 'Exchange a refresh token for a new access token',
  public: true,
  body: z.object({ refreshToken: z.string() }),
  response: envelope(z.object({ token: z.string(), refreshToken: z.string() })),
});

register({
  method: 'post',
  path: '/auth/forgot-password',
  tags: ['Authentication'],
  summary: 'Request a password reset email',
  public: true,
  body: z.object({ email: z.string().email() }),
});

register({
  method: 'post',
  path: '/auth/reset-password',
  tags: ['Authentication'],
  summary: 'Reset password using token from email',
  public: true,
  body: z.object({ token: z.string(), password: z.string().min(8) }),
});

register({
  method: 'get',
  path: '/auth/me',
  tags: ['Authentication'],
  summary: 'Get the currently authenticated user',
  response: envelope(User),
});

// ============================================================
// User settings
// ============================================================
register({
  method: 'get',
  path: '/settings',
  tags: ['User settings'],
  summary: 'Get user settings',
  response: envelope(z.record(z.string(), z.unknown())),
});

register({
  method: 'put',
  path: '/settings',
  tags: ['User settings'],
  summary: 'Update user settings',
  body: z.record(z.string(), z.unknown()),
});

// ============================================================
// Platform (tenants, members)
// ============================================================
const Tenant = z.object({
  id: Uuid,
  name: z.string(),
  slug: z.string(),
  createdAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/platform/tenants',
  tags: ['Platform'],
  summary: 'List tenants the current user belongs to',
  response: envelope(z.array(Tenant)),
});

register({
  method: 'get',
  path: '/platform/tenants/:id',
  tags: ['Platform'],
  summary: 'Get a tenant by id',
  params: z.object({ id: Uuid }),
  response: envelope(Tenant),
});

register({
  method: 'patch',
  path: '/platform/tenants/:id',
  tags: ['Platform'],
  summary: 'Update tenant settings',
  params: z.object({ id: Uuid }),
  body: z.object({ name: z.string().optional(), slug: z.string().optional() }),
  response: envelope(Tenant),
});

register({
  method: 'get',
  path: '/platform/tenants/:id/users',
  tags: ['Platform'],
  summary: 'List members of a tenant',
  params: z.object({ id: Uuid }),
  response: envelope(z.array(User.extend({ role: z.enum(['owner', 'admin', 'member']) }))),
});

register({
  method: 'post',
  path: '/platform/tenants/:id/invitations',
  tags: ['Platform'],
  summary: 'Invite a user to join a tenant',
  params: z.object({ id: Uuid }),
  body: z.object({ email: z.string().email(), role: z.enum(['admin', 'member']) }),
});

register({
  method: 'get',
  path: '/platform/tenants/:id/apps',
  tags: ['Platform'],
  summary: 'List apps enabled for a tenant',
  params: z.object({ id: Uuid }),
  response: envelope(z.array(z.object({ appId: z.string(), enabled: z.boolean() }))),
});

register({
  method: 'post',
  path: '/platform/tenants/:id/apps/:appId/enable',
  tags: ['Platform'],
  summary: 'Enable an app for a tenant',
  params: z.object({ id: Uuid, appId: z.string() }),
});

register({
  method: 'post',
  path: '/platform/tenants/:id/apps/:appId/disable',
  tags: ['Platform'],
  summary: 'Disable an app for a tenant',
  params: z.object({ id: Uuid, appId: z.string() }),
});

// ============================================================
// Notifications
// ============================================================
const Notification = z.object({
  id: Uuid,
  title: z.string(),
  body: z.string().nullable(),
  readAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/notifications',
  tags: ['Notifications'],
  summary: 'List notifications for the current user',
  query: z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }),
  response: envelope(z.array(Notification)),
});

register({
  method: 'get',
  path: '/notifications/unread-count',
  tags: ['Notifications'],
  summary: 'Get unread notification count',
  response: envelope(z.object({ count: z.number().int() })),
});

register({
  method: 'post',
  path: '/notifications/read-all',
  tags: ['Notifications'],
  summary: 'Mark all notifications as read',
});

register({
  method: 'post',
  path: '/notifications/:id/read',
  tags: ['Notifications'],
  summary: 'Mark a single notification as read',
  params: z.object({ id: Uuid }),
});

register({
  method: 'delete',
  path: '/notifications/:id',
  tags: ['Notifications'],
  summary: 'Delete a notification',
  params: z.object({ id: Uuid }),
});

// ============================================================
// Global search
// ============================================================
register({
  method: 'get',
  path: '/search',
  tags: ['Search'],
  summary: 'Global search across all apps',
  query: z.object({
    q: z.string().min(1).openapi({ example: 'invoice' }),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
  response: envelope(
    z.array(
      z.object({
        appId: z.string(),
        recordId: Uuid,
        title: z.string(),
        snippet: z.string().nullable(),
      }),
    ),
  ),
});

// ============================================================
// Exchange rates
// ============================================================
register({
  method: 'get',
  path: '/exchange-rates/convert',
  tags: ['Exchange rates'],
  summary: 'Convert an amount between currencies with multi-provider fallback',
  query: z.object({
    from: z.string().length(3).openapi({ example: 'USD' }),
    to: z.string().length(3).openapi({ example: 'EUR' }),
    amount: z.coerce.number().optional().openapi({ example: 100 }),
  }),
  response: envelope(
    z.object({
      from: z.string().length(3),
      to: z.string().length(3),
      rate: z.number().openapi({ example: 0.85034 }),
      amount: z.number(),
      converted: z.number(),
      provider: z.string().openapi({ example: 'frankfurter' }),
      cached: z.boolean(),
    }),
  ),
  extraResponses: {
    400: { description: 'Invalid currency or amount', schema: EnvelopeError },
    503: {
      description: 'All rate providers failed',
      schema: EnvelopeError.extend({ code: z.literal('RATE_UNAVAILABLE') }),
    },
  },
});

register({
  method: 'get',
  path: '/exchange-rates/rates',
  tags: ['Exchange rates'],
  summary: 'Get rates for multiple target currencies against a base',
  query: z.object({
    base: z.string().length(3).openapi({ example: 'USD' }),
    targets: z.string().openapi({ example: 'EUR,GBP,TRY', description: 'Comma-separated ISO codes' }),
  }),
  response: envelope(
    z.object({
      base: z.string().length(3),
      rates: z.record(z.string(), z.object({ rate: z.number(), provider: z.string() })),
    }),
  ),
});

// ============================================================
// Record links
// ============================================================
const RecordLink = z.object({
  id: Uuid,
  sourceAppId: z.string(),
  sourceRecordId: Uuid,
  targetAppId: z.string(),
  targetRecordId: Uuid,
  createdAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/links/:appId/:recordId',
  tags: ['Record links'],
  summary: 'List all cross-app links for a record',
  params: z.object({ appId: z.string(), recordId: Uuid }),
  response: envelope(z.array(RecordLink)),
});

register({
  method: 'post',
  path: '/links',
  tags: ['Record links'],
  summary: 'Create a link between two records',
  body: z.object({
    sourceAppId: z.string(),
    sourceRecordId: Uuid,
    targetAppId: z.string(),
    targetRecordId: Uuid,
  }),
  response: envelope(RecordLink),
});

register({
  method: 'delete',
  path: '/links/:id',
  tags: ['Record links'],
  summary: 'Delete a record link',
  params: z.object({ id: Uuid }),
});

// ============================================================
// CRM
// ============================================================
const Company = z.object({
  id: Uuid,
  name: z.string(),
  website: z.string().url().nullable(),
  industry: z.string().nullable(),
  isArchived: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/crm/companies/list',
  tags: ['CRM'],
  summary: 'List companies',
  response: envelope(z.array(Company)),
});

register({
  method: 'post',
  path: '/crm/companies',
  tags: ['CRM'],
  summary: 'Create a company',
  body: z.object({ name: z.string(), website: z.string().url().optional(), industry: z.string().optional() }),
  response: envelope(Company),
});

register({
  method: 'get',
  path: '/crm/companies/:id',
  tags: ['CRM'],
  summary: 'Get a company',
  params: z.object({ id: Uuid }),
  response: envelope(Company),
});

register({
  method: 'patch',
  path: '/crm/companies/:id',
  tags: ['CRM'],
  summary: 'Update a company',
  params: z.object({ id: Uuid }),
  body: z.object({ name: z.string().optional(), website: z.string().url().nullable().optional() }),
  concurrency: true,
  response: envelope(Company),
});

register({
  method: 'delete',
  path: '/crm/companies/:id',
  tags: ['CRM'],
  summary: 'Delete a company',
  params: z.object({ id: Uuid }),
});

const Contact = z.object({
  id: Uuid,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  companyId: Uuid.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/crm/contacts/list',
  tags: ['CRM'],
  summary: 'List contacts',
  response: envelope(z.array(Contact)),
});

register({
  method: 'post',
  path: '/crm/contacts',
  tags: ['CRM'],
  summary: 'Create a contact',
  body: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    companyId: Uuid.optional(),
  }),
  response: envelope(Contact),
});

register({
  method: 'patch',
  path: '/crm/contacts/:id',
  tags: ['CRM'],
  summary: 'Update a contact',
  params: z.object({ id: Uuid }),
  body: Contact.partial(),
  concurrency: true,
  response: envelope(Contact),
});

register({
  method: 'delete',
  path: '/crm/contacts/:id',
  tags: ['CRM'],
  summary: 'Delete a contact',
  params: z.object({ id: Uuid }),
});

const Deal = z.object({
  id: Uuid,
  title: z.string(),
  value: z.number(),
  currency: z.string().length(3),
  stageId: Uuid,
  companyId: Uuid.nullable(),
  contactId: Uuid.nullable(),
  status: z.enum(['open', 'won', 'lost']),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/crm/deals/list',
  tags: ['CRM'],
  summary: 'List deals',
  response: envelope(z.array(Deal)),
});

register({
  method: 'post',
  path: '/crm/deals',
  tags: ['CRM'],
  summary: 'Create a deal',
  body: z.object({ title: z.string(), value: z.number(), currency: z.string().length(3), stageId: Uuid }),
  response: envelope(Deal),
});

register({
  method: 'patch',
  path: '/crm/deals/:id',
  tags: ['CRM'],
  summary: 'Update a deal',
  params: z.object({ id: Uuid }),
  body: Deal.partial(),
  concurrency: true,
  response: envelope(Deal),
});

register({
  method: 'get',
  path: '/crm/dashboard',
  tags: ['CRM'],
  summary: 'Get CRM dashboard KPIs',
  response: envelope(z.record(z.string(), z.unknown())),
});

// ============================================================
// HR
// ============================================================
const Employee = z.object({
  id: Uuid,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  department: z.string().nullable(),
  role: z.string().nullable(),
  startDate: IsoDate.nullable(),
  isArchived: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/hr/employees',
  tags: ['HR'],
  summary: 'List employees',
  response: envelope(z.array(Employee)),
});

register({
  method: 'post',
  path: '/hr/employees',
  tags: ['HR'],
  summary: 'Create an employee',
  body: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    department: z.string().optional(),
    role: z.string().optional(),
  }),
  response: envelope(Employee),
});

register({
  method: 'patch',
  path: '/hr/employees/:id',
  tags: ['HR'],
  summary: 'Update an employee',
  params: z.object({ id: Uuid }),
  body: Employee.partial(),
  concurrency: true,
  response: envelope(Employee),
});

const LeaveRequest = z.object({
  id: Uuid,
  employeeId: Uuid,
  leaveTypeId: Uuid,
  startDate: IsoDate,
  endDate: IsoDate,
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  note: z.string().nullable(),
  createdAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/hr/leave-requests',
  tags: ['HR'],
  summary: 'List leave requests',
  query: z.object({ employeeId: Uuid.optional(), status: LeaveRequest.shape.status.optional() }),
  response: envelope(z.array(LeaveRequest)),
});

register({
  method: 'post',
  path: '/hr/leave-requests',
  tags: ['HR'],
  summary: 'Create a leave request',
  body: z.object({
    employeeId: Uuid,
    leaveTypeId: Uuid,
    startDate: IsoDate,
    endDate: IsoDate,
    note: z.string().optional(),
  }),
  response: envelope(LeaveRequest),
});

register({
  method: 'post',
  path: '/hr/leave-requests/:id/approve',
  tags: ['HR'],
  summary: 'Approve a leave request',
  params: z.object({ id: Uuid }),
});

register({
  method: 'post',
  path: '/hr/leave-requests/:id/reject',
  tags: ['HR'],
  summary: 'Reject a leave request',
  params: z.object({ id: Uuid }),
});

// ============================================================
// Work (tasks + projects)
// ============================================================
const Task = z.object({
  id: Uuid,
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).nullable(),
  dueDate: IsoDate.nullable(),
  assigneeId: Uuid.nullable(),
  projectId: Uuid.nullable(),
  isPrivate: z.boolean(),
  isArchived: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/work/tasks',
  tags: ['Work'],
  summary: 'List tasks',
  query: z.object({
    projectId: Uuid.optional(),
    status: Task.shape.status.optional(),
    assigneeId: Uuid.optional(),
  }),
  response: envelope(z.array(Task)),
});

register({
  method: 'post',
  path: '/work/tasks',
  tags: ['Work'],
  summary: 'Create a task',
  body: z.object({
    title: z.string(),
    projectId: Uuid.optional(),
    assigneeId: Uuid.optional(),
    dueDate: IsoDate.optional(),
  }),
  response: envelope(Task),
});

register({
  method: 'get',
  path: '/work/tasks/:id',
  tags: ['Work'],
  summary: 'Get a task',
  params: z.object({ id: Uuid }),
  response: envelope(Task),
});

register({
  method: 'patch',
  path: '/work/tasks/:id',
  tags: ['Work'],
  summary: 'Update a task',
  params: z.object({ id: Uuid }),
  body: Task.partial(),
  concurrency: true,
  response: envelope(Task),
});

register({
  method: 'delete',
  path: '/work/tasks/:id',
  tags: ['Work'],
  summary: 'Delete a task',
  params: z.object({ id: Uuid }),
});

const Project = z.object({
  id: Uuid,
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(['active', 'paused', 'completed', 'archived']),
  clientId: Uuid.nullable(),
  startDate: IsoDate.nullable(),
  endDate: IsoDate.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/work/projects',
  tags: ['Work'],
  summary: 'List projects',
  response: envelope(z.array(Project)),
});

register({
  method: 'post',
  path: '/work/projects',
  tags: ['Work'],
  summary: 'Create a project',
  body: z.object({ name: z.string(), description: z.string().optional() }),
  response: envelope(Project),
});

register({
  method: 'patch',
  path: '/work/projects/:id',
  tags: ['Work'],
  summary: 'Update a project',
  params: z.object({ id: Uuid }),
  body: Project.partial(),
  concurrency: true,
  response: envelope(Project),
});

// ============================================================
// Invoices
// ============================================================
const Invoice = z.object({
  id: Uuid,
  invoiceNumber: z.string().openapi({ example: 'INV-2026-008' }),
  status: z.enum(['draft', 'unpaid', 'paid', 'overdue', 'waived']),
  subtotal: z.number(),
  taxAmount: z.number(),
  discountAmount: z.number(),
  total: z.number(),
  currency: z.string().length(3),
  issueDate: IsoDate,
  dueDate: IsoDate.nullable(),
  clientId: Uuid.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/invoices/list',
  tags: ['Invoices'],
  summary: 'List invoices',
  query: z.object({
    status: Invoice.shape.status.optional(),
    archived: z.coerce.boolean().optional(),
  }),
  response: envelope(z.array(Invoice)),
});

register({
  method: 'post',
  path: '/invoices',
  tags: ['Invoices'],
  summary: 'Create an invoice',
  body: z.object({
    clientId: Uuid.optional(),
    currency: z.string().length(3),
    issueDate: IsoDate,
    dueDate: IsoDate.optional(),
    items: z.array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
      }),
    ),
  }),
  response: envelope(Invoice),
});

register({
  method: 'get',
  path: '/invoices/:id',
  tags: ['Invoices'],
  summary: 'Get an invoice',
  params: z.object({ id: Uuid }),
  response: envelope(Invoice),
});

register({
  method: 'patch',
  path: '/invoices/:id',
  tags: ['Invoices'],
  summary: 'Update an invoice',
  params: z.object({ id: Uuid }),
  body: Invoice.partial(),
  concurrency: true,
  response: envelope(Invoice),
});

register({
  method: 'delete',
  path: '/invoices/:id',
  tags: ['Invoices'],
  summary: 'Delete an invoice',
  params: z.object({ id: Uuid }),
});

register({
  method: 'get',
  path: '/invoices/:id/pdf',
  tags: ['Invoices'],
  summary: 'Download invoice PDF',
  params: z.object({ id: Uuid }),
  extraResponses: {
    200: { description: 'PDF binary', schema: z.string().openapi({ format: 'binary' }) },
  },
});

register({
  method: 'post',
  path: '/invoices/:id/send-reminder',
  tags: ['Invoices'],
  summary: 'Send a payment reminder email to the client',
  params: z.object({ id: Uuid }),
});

register({
  method: 'get',
  path: '/invoices/dashboard',
  tags: ['Invoices'],
  summary: 'Get invoices dashboard KPIs',
  response: envelope(z.record(z.string(), z.unknown())),
});

// ============================================================
// Sign
// ============================================================
const SignDocument = z.object({
  id: Uuid,
  title: z.string(),
  status: z.enum(['draft', 'sent', 'signed', 'declined', 'expired']),
  pdfUrl: z.string().url().nullable(),
  signerEmail: z.string().email().nullable(),
  signedAt: IsoDateTime.nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/sign',
  tags: ['Sign'],
  summary: 'List signature documents',
  response: envelope(z.array(SignDocument)),
});

register({
  method: 'post',
  path: '/sign',
  tags: ['Sign'],
  summary: 'Create a signature document',
  body: z.object({ title: z.string(), signerEmail: z.string().email() }),
  response: envelope(SignDocument),
});

register({
  method: 'get',
  path: '/sign/:id',
  tags: ['Sign'],
  summary: 'Get a signature document',
  params: z.object({ id: Uuid }),
  response: envelope(SignDocument),
});

register({
  method: 'put',
  path: '/sign/:id',
  tags: ['Sign'],
  summary: 'Update a signature document',
  params: z.object({ id: Uuid }),
  body: SignDocument.partial(),
  concurrency: true,
  response: envelope(SignDocument),
});

register({
  method: 'delete',
  path: '/sign/:id',
  tags: ['Sign'],
  summary: 'Delete a signature document',
  params: z.object({ id: Uuid }),
});

// ============================================================
// Drive
// ============================================================
const DriveItem = z.object({
  id: Uuid,
  name: z.string(),
  type: z.enum(['folder', 'file']),
  mimeType: z.string().nullable(),
  size: z.number().nullable(),
  parentId: Uuid.nullable(),
  isFavourite: z.boolean(),
  isTrashed: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/drive',
  tags: ['Drive'],
  summary: 'List drive items',
  query: z.object({ parentId: Uuid.optional() }),
  response: envelope(z.array(DriveItem)),
});

register({
  method: 'post',
  path: '/drive/folder',
  tags: ['Drive'],
  summary: 'Create a folder',
  body: z.object({ name: z.string(), parentId: Uuid.optional() }),
  response: envelope(DriveItem),
});

register({
  method: 'get',
  path: '/drive/search',
  tags: ['Drive'],
  summary: 'Search drive items',
  query: z.object({ q: z.string().min(1) }),
  response: envelope(z.array(DriveItem)),
});

register({
  method: 'get',
  path: '/drive/storage',
  tags: ['Drive'],
  summary: 'Get storage usage',
  response: envelope(z.object({ used: z.number(), quota: z.number().nullable() })),
});

register({
  method: 'post',
  path: '/drive/batch/trash',
  tags: ['Drive'],
  summary: 'Move items to trash',
  body: z.object({ itemIds: z.array(Uuid) }),
});

// ============================================================
// Write (docs)
// ============================================================
const Document = z.object({
  id: Uuid,
  title: z.string(),
  content: z.string().nullable(),
  parentId: Uuid.nullable(),
  isArchived: z.boolean(),
  isPrivate: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/docs',
  tags: ['Write'],
  summary: 'List documents',
  response: envelope(z.array(Document)),
});

register({
  method: 'post',
  path: '/docs',
  tags: ['Write'],
  summary: 'Create a document',
  body: z.object({ title: z.string(), parentId: Uuid.optional() }),
  response: envelope(Document),
});

register({
  method: 'get',
  path: '/docs/:id',
  tags: ['Write'],
  summary: 'Get a document',
  params: z.object({ id: Uuid }),
  response: envelope(Document),
});

register({
  method: 'patch',
  path: '/docs/:id',
  tags: ['Write'],
  summary: 'Update a document',
  params: z.object({ id: Uuid }),
  body: Document.partial(),
  concurrency: true,
  response: envelope(Document),
});

register({
  method: 'delete',
  path: '/docs/:id',
  tags: ['Write'],
  summary: 'Delete a document',
  params: z.object({ id: Uuid }),
});

// ============================================================
// Draw
// ============================================================
const Drawing = z.object({
  id: Uuid,
  title: z.string(),
  excalidrawData: z.unknown(),
  isArchived: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/drawings',
  tags: ['Draw'],
  summary: 'List drawings',
  response: envelope(z.array(Drawing)),
});

register({
  method: 'post',
  path: '/drawings',
  tags: ['Draw'],
  summary: 'Create a drawing',
  body: z.object({ title: z.string() }),
  response: envelope(Drawing),
});

register({
  method: 'get',
  path: '/drawings/:id',
  tags: ['Draw'],
  summary: 'Get a drawing',
  params: z.object({ id: Uuid }),
  response: envelope(Drawing),
});

register({
  method: 'patch',
  path: '/drawings/:id',
  tags: ['Draw'],
  summary: 'Update a drawing',
  params: z.object({ id: Uuid }),
  body: Drawing.partial(),
  concurrency: true,
  response: envelope(Drawing),
});

register({
  method: 'delete',
  path: '/drawings/:id',
  tags: ['Draw'],
  summary: 'Delete a drawing',
  params: z.object({ id: Uuid }),
});

// ============================================================
// Calendar
// ============================================================
const CalendarEvent = z.object({
  id: Uuid,
  calendarId: Uuid,
  title: z.string(),
  description: z.string().nullable(),
  start: IsoDateTime,
  end: IsoDateTime,
  allDay: z.boolean(),
  location: z.string().nullable(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});

register({
  method: 'get',
  path: '/calendar/calendars',
  tags: ['Calendar'],
  summary: 'List calendars',
  response: envelope(z.array(z.object({ id: Uuid, name: z.string(), color: z.string() }))),
});

register({
  method: 'get',
  path: '/calendar/events',
  tags: ['Calendar'],
  summary: 'List calendar events',
  query: z.object({ from: IsoDateTime.optional(), to: IsoDateTime.optional() }),
  response: envelope(z.array(CalendarEvent)),
});

register({
  method: 'post',
  path: '/calendar/events',
  tags: ['Calendar'],
  summary: 'Create a calendar event',
  body: z.object({
    calendarId: Uuid,
    title: z.string(),
    start: IsoDateTime,
    end: IsoDateTime,
    allDay: z.boolean().optional(),
  }),
  response: envelope(CalendarEvent),
});

register({
  method: 'patch',
  path: '/calendar/events/:eventId',
  tags: ['Calendar'],
  summary: 'Update a calendar event',
  params: z.object({ eventId: Uuid }),
  body: CalendarEvent.partial(),
  response: envelope(CalendarEvent),
});

register({
  method: 'delete',
  path: '/calendar/events/:eventId',
  tags: ['Calendar'],
  summary: 'Delete a calendar event',
  params: z.object({ eventId: Uuid }),
});

// ============================================================
// File upload
// ============================================================
register({
  method: 'post',
  path: '/upload',
  tags: ['Files'],
  summary: 'Upload a file (multipart/form-data)',
  response: envelope(z.object({ url: z.string().url(), filename: z.string(), size: z.number() })),
});

// ============================================================
// Health
// ============================================================
openApiRegistry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Health check (no auth)',
  responses: {
    200: {
      description: 'OK',
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('ok'),
            uptime: z.number(),
            memory: z.object({ rss: z.number(), heapUsed: z.number() }),
            version: z.string(),
          }),
        },
      },
    },
  },
});

// ---------- Document builder ----------
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(openApiRegistry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Atlas API',
      version: process.env.npm_package_version ?? '2.2.0',
      description:
        'Atlas platform API. All responses follow `{ success, data | error }`. Authenticated endpoints require `Authorization: Bearer <token>`.',
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'Authentication' },
      { name: 'User settings' },
      { name: 'Platform' },
      { name: 'Notifications' },
      { name: 'Search' },
      { name: 'Record links' },
      { name: 'Exchange rates' },
      { name: 'Files' },
      { name: 'CRM' },
      { name: 'HR' },
      { name: 'Work' },
      { name: 'Invoices' },
      { name: 'Sign' },
      { name: 'Drive' },
      { name: 'Write' },
      { name: 'Draw' },
      { name: 'Calendar' },
      { name: 'System' },
    ],
  });
}
