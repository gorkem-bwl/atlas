import type { TableColumn, TableRow } from '@atlas-platform/shared';

// ─── Table template types & categories ───────────────────────────────

export type TableTemplateCategory = 'Business' | 'Engineering' | 'Marketing' | 'HR & People' | 'Personal' | 'General';

export const TABLE_TEMPLATE_CATEGORIES: TableTemplateCategory[] = [
  'Business', 'Engineering', 'Marketing', 'HR & People', 'Personal', 'General',
];

export const TABLE_CATEGORY_COLORS: Record<TableTemplateCategory, string> = {
  Business: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Engineering: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  Marketing: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'HR & People': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  Personal: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  General: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
};

export interface TableTemplate {
  key: string;
  name: string;
  icon: string;
  description: string;
  category: TableTemplateCategory;
  tags: string[];
  createData: () => { title: string; columns: TableColumn[]; rows: TableRow[] };
}

export const TABLE_TEMPLATES: TableTemplate[] = [
  // ── Business ──────────────────────────────────────────────────────
  {
    key: 'projectTracker',
    name: 'Project tracker',
    icon: 'ClipboardList',
    description: 'Tasks, assignees, priorities, due dates, progress',
    category: 'Business',
    tags: ['project', 'tasks', 'management'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Task', type: 'text', width: 250 },
        { id: crypto.randomUUID(), name: 'Assignee', type: 'text', width: 150 },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 140, options: ['Not started', 'In progress', 'Done', 'Blocked'] },
        { id: crypto.randomUUID(), name: 'Priority', type: 'singleSelect', width: 120, options: ['Low', 'Medium', 'High', 'Critical'] },
        { id: crypto.randomUUID(), name: 'Due date', type: 'date', width: 130 },
        { id: crypto.randomUUID(), name: 'Progress', type: 'percent', width: 120 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Design homepage wireframe', [cols[1].id]: 'Alice', [cols[2].id]: 'In progress', [cols[3].id]: 'High', [cols[5].id]: 60 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Set up CI/CD pipeline', [cols[1].id]: 'Bob', [cols[2].id]: 'Done', [cols[3].id]: 'Critical', [cols[5].id]: 100 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Write API documentation', [cols[1].id]: 'Carol', [cols[2].id]: 'Not started', [cols[3].id]: 'Medium', [cols[5].id]: 0 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'User authentication', [cols[1].id]: 'Alice', [cols[2].id]: 'In progress', [cols[3].id]: 'High', [cols[5].id]: 40 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Database migration', [cols[1].id]: 'Bob', [cols[2].id]: 'Blocked', [cols[3].id]: 'Critical', [cols[5].id]: 20 },
      ];
      return { title: 'Project tracker', columns: cols, rows };
    },
  },
  {
    key: 'crmContacts',
    name: 'CRM contacts',
    icon: 'Users',
    description: 'Leads, deals, pipeline stages, contact info',
    category: 'Business',
    tags: ['crm', 'sales', 'contacts', 'pipeline'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Name', type: 'text', width: 180 },
        { id: crypto.randomUUID(), name: 'Email', type: 'email', width: 220 },
        { id: crypto.randomUUID(), name: 'Company', type: 'text', width: 160 },
        { id: crypto.randomUUID(), name: 'Phone', type: 'phone', width: 150 },
        { id: crypto.randomUUID(), name: 'Stage', type: 'singleSelect', width: 140, options: ['Lead', 'Qualified', 'Proposal', 'Closed won', 'Closed lost'] },
        { id: crypto.randomUUID(), name: 'Deal value', type: 'currency', width: 120 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Jane Cooper', [cols[1].id]: 'jane@acme.com', [cols[2].id]: 'Acme Corp', [cols[3].id]: '(555) 123-4567', [cols[4].id]: 'Qualified', [cols[5].id]: 15000 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Marcus Chen', [cols[1].id]: 'marcus@globex.com', [cols[2].id]: 'Globex Inc', [cols[3].id]: '(555) 987-6543', [cols[4].id]: 'Proposal', [cols[5].id]: 42000 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Sarah Miller', [cols[1].id]: 'sarah@initech.com', [cols[2].id]: 'Initech', [cols[3].id]: '(555) 246-8135', [cols[4].id]: 'Lead', [cols[5].id]: 8500 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Tom Wilson', [cols[1].id]: 'tom@wayne.com', [cols[2].id]: 'Wayne Enterprises', [cols[3].id]: '(555) 369-1478', [cols[4].id]: 'Closed won', [cols[5].id]: 75000 },
      ];
      return { title: 'CRM contacts', columns: cols, rows };
    },
  },
  {
    key: 'inventory',
    name: 'Inventory',
    icon: 'Package',
    description: 'Products, SKUs, quantities, prices, stock status',
    category: 'Business',
    tags: ['inventory', 'stock', 'products', 'warehouse'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Product', type: 'text', width: 220 },
        { id: crypto.randomUUID(), name: 'SKU', type: 'text', width: 120 },
        { id: crypto.randomUUID(), name: 'Category', type: 'singleSelect', width: 140, options: ['Electronics', 'Clothing', 'Food', 'Office supplies'] },
        { id: crypto.randomUUID(), name: 'Quantity', type: 'number', width: 100 },
        { id: crypto.randomUUID(), name: 'Price', type: 'currency', width: 110 },
        { id: crypto.randomUUID(), name: 'In stock', type: 'checkbox', width: 100 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Wireless keyboard', [cols[1].id]: 'WK-001', [cols[2].id]: 'Electronics', [cols[3].id]: 45, [cols[4].id]: 59.99, [cols[5].id]: true },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Cotton t-shirt (M)', [cols[1].id]: 'TS-024', [cols[2].id]: 'Clothing', [cols[3].id]: 120, [cols[4].id]: 19.99, [cols[5].id]: true },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Organic coffee beans (1kg)', [cols[1].id]: 'CB-100', [cols[2].id]: 'Food', [cols[3].id]: 0, [cols[4].id]: 24.50, [cols[5].id]: false },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Sticky notes (pack of 12)', [cols[1].id]: 'SN-050', [cols[2].id]: 'Office supplies', [cols[3].id]: 200, [cols[4].id]: 8.99, [cols[5].id]: true },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'USB-C hub', [cols[1].id]: 'UH-003', [cols[2].id]: 'Electronics', [cols[3].id]: 12, [cols[4].id]: 34.99, [cols[5].id]: true },
      ];
      return { title: 'Inventory', columns: cols, rows };
    },
  },
  {
    key: 'expenseTracker',
    name: 'Expense tracker',
    icon: 'DollarSign',
    description: 'Track spending by category, date, and status',
    category: 'Business',
    tags: ['expenses', 'finance', 'budget', 'spending'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Description', type: 'text', width: 240 },
        { id: crypto.randomUUID(), name: 'Amount', type: 'currency', width: 120 },
        { id: crypto.randomUUID(), name: 'Category', type: 'singleSelect', width: 140, options: ['Travel', 'Software', 'Office', 'Meals', 'Marketing', 'Other'] },
        { id: crypto.randomUUID(), name: 'Date', type: 'date', width: 130 },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 130, options: ['Pending', 'Approved', 'Rejected', 'Reimbursed'] },
        { id: crypto.randomUUID(), name: 'Receipt', type: 'checkbox', width: 90 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Flight to NYC', [cols[1].id]: 450, [cols[2].id]: 'Travel', [cols[4].id]: 'Approved', [cols[5].id]: true },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Figma annual license', [cols[1].id]: 144, [cols[2].id]: 'Software', [cols[4].id]: 'Reimbursed', [cols[5].id]: true },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Team lunch', [cols[1].id]: 87.50, [cols[2].id]: 'Meals', [cols[4].id]: 'Pending', [cols[5].id]: false },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Standing desk', [cols[1].id]: 599, [cols[2].id]: 'Office', [cols[4].id]: 'Approved', [cols[5].id]: true },
      ];
      return { title: 'Expense tracker', columns: cols, rows };
    },
  },
  {
    key: 'meetingNotes',
    name: 'Meeting notes',
    icon: 'CalendarDays',
    description: 'Meeting log with attendees, decisions, action items',
    category: 'Business',
    tags: ['meetings', 'notes', 'agenda', 'decisions'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Meeting', type: 'text', width: 240 },
        { id: crypto.randomUUID(), name: 'Date', type: 'date', width: 130 },
        { id: crypto.randomUUID(), name: 'Attendees', type: 'text', width: 200 },
        { id: crypto.randomUUID(), name: 'Type', type: 'singleSelect', width: 130, options: ['Standup', '1-on-1', 'Planning', 'Review', 'All-hands'] },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 300 },
        { id: crypto.randomUUID(), name: 'Action items', type: 'longText', width: 280 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Sprint planning', [cols[2].id]: 'Alice, Bob, Carol', [cols[3].id]: 'Planning', [cols[4].id]: 'Scoped Q2 features, assigned stories', [cols[5].id]: 'Alice: finalize designs by Friday' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Weekly standup', [cols[2].id]: 'Full team', [cols[3].id]: 'Standup', [cols[4].id]: 'All on track, no blockers', [cols[5].id]: 'Bob: deploy staging build' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Product review', [cols[2].id]: 'PM, Design, Eng leads', [cols[3].id]: 'Review', [cols[4].id]: 'Approved new dashboard mockups', [cols[5].id]: 'Carol: share updated specs' },
      ];
      return { title: 'Meeting notes', columns: cols, rows };
    },
  },

  // ── Engineering ───────────────────────────────────────────────────
  {
    key: 'bugTracker',
    name: 'Bug tracker',
    icon: 'Bug',
    description: 'Bugs, severity, status, descriptions, reporters',
    category: 'Engineering',
    tags: ['bugs', 'issues', 'qa', 'testing'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Bug title', type: 'text', width: 260 },
        { id: crypto.randomUUID(), name: 'Severity', type: 'singleSelect', width: 120, options: ['Low', 'Medium', 'High', 'Critical'] },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 130, options: ['Open', 'Investigating', 'Fix in progress', 'Resolved', 'Closed'] },
        { id: crypto.randomUUID(), name: 'Reported by', type: 'text', width: 140 },
        { id: crypto.randomUUID(), name: 'Description', type: 'longText', width: 300 },
        { id: crypto.randomUUID(), name: 'Created', type: 'date', width: 130 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Login page crash on Safari', [cols[1].id]: 'Critical', [cols[2].id]: 'Fix in progress', [cols[3].id]: 'QA Team', [cols[4].id]: 'Page crashes when clicking sign in on Safari 17' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Misaligned button on mobile', [cols[1].id]: 'Low', [cols[2].id]: 'Open', [cols[3].id]: 'Jane', [cols[4].id]: 'Submit button overlaps footer on iPhone SE' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Email notifications not sent', [cols[1].id]: 'High', [cols[2].id]: 'Investigating', [cols[3].id]: 'Support', [cols[4].id]: 'Users not receiving password reset emails' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'CSV export missing headers', [cols[1].id]: 'Medium', [cols[2].id]: 'Resolved', [cols[3].id]: 'Tom', [cols[4].id]: 'Exported CSV files are missing the header row' },
      ];
      return { title: 'Bug tracker', columns: cols, rows };
    },
  },
  {
    key: 'apiEndpoints',
    name: 'API endpoints',
    icon: 'Plug',
    description: 'Document REST endpoints, methods, auth, status',
    category: 'Engineering',
    tags: ['api', 'rest', 'documentation', 'endpoints'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Endpoint', type: 'text', width: 240 },
        { id: crypto.randomUUID(), name: 'Method', type: 'singleSelect', width: 100, options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
        { id: crypto.randomUUID(), name: 'Auth required', type: 'checkbox', width: 110 },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 120, options: ['Stable', 'Beta', 'Deprecated', 'Planned'] },
        { id: crypto.randomUUID(), name: 'Description', type: 'longText', width: 280 },
        { id: crypto.randomUUID(), name: 'Rate limit', type: 'text', width: 120 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: '/api/v1/users', [cols[1].id]: 'GET', [cols[2].id]: true, [cols[3].id]: 'Stable', [cols[4].id]: 'List all users with pagination', [cols[5].id]: '100/min' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: '/api/v1/users', [cols[1].id]: 'POST', [cols[2].id]: true, [cols[3].id]: 'Stable', [cols[4].id]: 'Create a new user account', [cols[5].id]: '20/min' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: '/api/v1/auth/login', [cols[1].id]: 'POST', [cols[2].id]: false, [cols[3].id]: 'Stable', [cols[4].id]: 'Authenticate and receive JWT tokens', [cols[5].id]: '10/min' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: '/api/v2/search', [cols[1].id]: 'GET', [cols[2].id]: true, [cols[3].id]: 'Beta', [cols[4].id]: 'Full-text search across resources', [cols[5].id]: '30/min' },
      ];
      return { title: 'API endpoints', columns: cols, rows };
    },
  },
  {
    key: 'releaseLog',
    name: 'Release log',
    icon: 'Rocket',
    description: 'Track releases, versions, changelog, deploy status',
    category: 'Engineering',
    tags: ['releases', 'changelog', 'deploys', 'versions'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Version', type: 'text', width: 120 },
        { id: crypto.randomUUID(), name: 'Release date', type: 'date', width: 130 },
        { id: crypto.randomUUID(), name: 'Type', type: 'singleSelect', width: 120, options: ['Major', 'Minor', 'Patch', 'Hotfix'] },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 120, options: ['Planned', 'In QA', 'Deployed', 'Rolled back'] },
        { id: crypto.randomUUID(), name: 'Changes', type: 'longText', width: 320 },
        { id: crypto.randomUUID(), name: 'Owner', type: 'text', width: 140 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'v2.4.0', [cols[2].id]: 'Minor', [cols[3].id]: 'Deployed', [cols[4].id]: 'New dashboard widgets, performance improvements', [cols[5].id]: 'Alice' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'v2.4.1', [cols[2].id]: 'Patch', [cols[3].id]: 'In QA', [cols[4].id]: 'Fix calendar timezone bug, update deps', [cols[5].id]: 'Bob' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'v3.0.0', [cols[2].id]: 'Major', [cols[3].id]: 'Planned', [cols[4].id]: 'New editor, redesigned settings, API v2', [cols[5].id]: 'Carol' },
      ];
      return { title: 'Release log', columns: cols, rows };
    },
  },
  {
    key: 'techDebt',
    name: 'Tech debt',
    icon: 'Wrench',
    description: 'Track technical debt, effort, impact, ownership',
    category: 'Engineering',
    tags: ['tech debt', 'refactoring', 'maintenance'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Item', type: 'text', width: 260 },
        { id: crypto.randomUUID(), name: 'Area', type: 'singleSelect', width: 130, options: ['Frontend', 'Backend', 'Database', 'Infra', 'Testing'] },
        { id: crypto.randomUUID(), name: 'Impact', type: 'singleSelect', width: 110, options: ['Low', 'Medium', 'High'] },
        { id: crypto.randomUUID(), name: 'Effort', type: 'singleSelect', width: 110, options: ['Small', 'Medium', 'Large', 'XL'] },
        { id: crypto.randomUUID(), name: 'Owner', type: 'text', width: 130 },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 280 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Migrate to React 19', [cols[1].id]: 'Frontend', [cols[2].id]: 'High', [cols[3].id]: 'Large', [cols[5].id]: 'Needed for concurrent features' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Add database indexes', [cols[1].id]: 'Database', [cols[2].id]: 'High', [cols[3].id]: 'Small', [cols[5].id]: 'Query times > 500ms on user table' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Remove legacy auth module', [cols[1].id]: 'Backend', [cols[2].id]: 'Medium', [cols[3].id]: 'Medium', [cols[5].id]: 'Dead code after OAuth migration' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Set up E2E test suite', [cols[1].id]: 'Testing', [cols[2].id]: 'Medium', [cols[3].id]: 'Large', [cols[5].id]: 'Currently only unit tests' },
      ];
      return { title: 'Tech debt', columns: cols, rows };
    },
  },

  // ── Marketing ─────────────────────────────────────────────────────
  {
    key: 'contentCalendar',
    name: 'Content calendar',
    icon: 'Calendar',
    description: 'Plan blog posts, social media, newsletters',
    category: 'Marketing',
    tags: ['content', 'calendar', 'social media', 'blog'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Title', type: 'text', width: 240 },
        { id: crypto.randomUUID(), name: 'Type', type: 'singleSelect', width: 130, options: ['Blog post', 'Social media', 'Newsletter', 'Video'] },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 130, options: ['Idea', 'Drafting', 'Review', 'Scheduled', 'Published'] },
        { id: crypto.randomUUID(), name: 'Author', type: 'text', width: 140 },
        { id: crypto.randomUUID(), name: 'Publish date', type: 'date', width: 130 },
        { id: crypto.randomUUID(), name: 'URL', type: 'url', width: 200 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: '10 tips for productivity', [cols[1].id]: 'Blog post', [cols[2].id]: 'Published', [cols[3].id]: 'Alex' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Product launch announcement', [cols[1].id]: 'Social media', [cols[2].id]: 'Scheduled', [cols[3].id]: 'Jamie' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Monthly newsletter - March', [cols[1].id]: 'Newsletter', [cols[2].id]: 'Drafting', [cols[3].id]: 'Pat' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Feature deep-dive video', [cols[1].id]: 'Video', [cols[2].id]: 'Idea', [cols[3].id]: 'Alex' },
      ];
      return { title: 'Content calendar', columns: cols, rows };
    },
  },
  {
    key: 'campaignTracker',
    name: 'Campaign tracker',
    icon: 'Megaphone',
    description: 'Marketing campaigns, budgets, channels, KPIs',
    category: 'Marketing',
    tags: ['campaigns', 'ads', 'budget', 'performance'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Campaign', type: 'text', width: 220 },
        { id: crypto.randomUUID(), name: 'Channel', type: 'singleSelect', width: 130, options: ['Google Ads', 'Facebook', 'Email', 'LinkedIn', 'Twitter/X', 'TikTok'] },
        { id: crypto.randomUUID(), name: 'Budget', type: 'currency', width: 120 },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 120, options: ['Draft', 'Active', 'Paused', 'Completed'] },
        { id: crypto.randomUUID(), name: 'Start date', type: 'date', width: 130 },
        { id: crypto.randomUUID(), name: 'Conversions', type: 'number', width: 110 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Spring sale 2025', [cols[1].id]: 'Google Ads', [cols[2].id]: 5000, [cols[3].id]: 'Active', [cols[5].id]: 342 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Product launch email', [cols[1].id]: 'Email', [cols[2].id]: 500, [cols[3].id]: 'Completed', [cols[5].id]: 1280 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Brand awareness', [cols[1].id]: 'LinkedIn', [cols[2].id]: 3000, [cols[3].id]: 'Active', [cols[5].id]: 89 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Summer promo', [cols[1].id]: 'Facebook', [cols[2].id]: 2000, [cols[3].id]: 'Draft', [cols[5].id]: 0 },
      ];
      return { title: 'Campaign tracker', columns: cols, rows };
    },
  },
  {
    key: 'competitorAnalysis',
    name: 'Competitor analysis',
    icon: 'Search',
    description: 'Compare competitors by features, pricing, positioning',
    category: 'Marketing',
    tags: ['competitors', 'analysis', 'research', 'market'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Competitor', type: 'text', width: 180 },
        { id: crypto.randomUUID(), name: 'Website', type: 'url', width: 200 },
        { id: crypto.randomUUID(), name: 'Pricing', type: 'text', width: 140 },
        { id: crypto.randomUUID(), name: 'Strength', type: 'longText', width: 240 },
        { id: crypto.randomUUID(), name: 'Weakness', type: 'longText', width: 240 },
        { id: crypto.randomUUID(), name: 'Threat level', type: 'singleSelect', width: 120, options: ['Low', 'Medium', 'High'] },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Acme Software', [cols[2].id]: '$29/mo', [cols[3].id]: 'Large user base, strong brand', [cols[4].id]: 'Slow to ship new features', [cols[5].id]: 'High' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Startup XYZ', [cols[2].id]: '$19/mo', [cols[3].id]: 'Modern UI, fast iteration', [cols[4].id]: 'Limited integrations', [cols[5].id]: 'Medium' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Legacy Corp', [cols[2].id]: '$99/mo', [cols[3].id]: 'Enterprise features, compliance', [cols[4].id]: 'Poor UX, expensive', [cols[5].id]: 'Low' },
      ];
      return { title: 'Competitor analysis', columns: cols, rows };
    },
  },

  // ── HR & People ───────────────────────────────────────────────────
  {
    key: 'hiringPipeline',
    name: 'Hiring pipeline',
    icon: 'Target',
    description: 'Track candidates, roles, interview stages',
    category: 'HR & People',
    tags: ['hiring', 'recruiting', 'candidates', 'interviews'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Candidate', type: 'text', width: 180 },
        { id: crypto.randomUUID(), name: 'Role', type: 'text', width: 180 },
        { id: crypto.randomUUID(), name: 'Stage', type: 'singleSelect', width: 140, options: ['Applied', 'Phone screen', 'Technical', 'On-site', 'Offer', 'Hired', 'Rejected'] },
        { id: crypto.randomUUID(), name: 'Email', type: 'email', width: 220 },
        { id: crypto.randomUUID(), name: 'Rating', type: 'rating', width: 120 },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 280 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Alex Rivera', [cols[1].id]: 'Senior Frontend Engineer', [cols[2].id]: 'Technical', [cols[3].id]: 'alex@email.com', [cols[4].id]: 4, [cols[5].id]: 'Strong React experience, good system design' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Maya Patel', [cols[1].id]: 'Product Designer', [cols[2].id]: 'On-site', [cols[3].id]: 'maya@email.com', [cols[4].id]: 5, [cols[5].id]: 'Exceptional portfolio, great culture fit' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'James Kim', [cols[1].id]: 'Backend Engineer', [cols[2].id]: 'Phone screen', [cols[3].id]: 'james@email.com', [cols[4].id]: 3, [cols[5].id]: 'Good experience but needs follow-up on system design' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Sofia Lund', [cols[1].id]: 'Senior Frontend Engineer', [cols[2].id]: 'Offer', [cols[3].id]: 'sofia@email.com', [cols[4].id]: 5, [cols[5].id]: 'Excellent across all interviews, offer sent' },
      ];
      return { title: 'Hiring pipeline', columns: cols, rows };
    },
  },
  {
    key: 'teamDirectory',
    name: 'Team directory',
    icon: 'Building2',
    description: 'Employee list with roles, departments, contacts',
    category: 'HR & People',
    tags: ['team', 'directory', 'employees', 'org chart'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Name', type: 'text', width: 180 },
        { id: crypto.randomUUID(), name: 'Role', type: 'text', width: 200 },
        { id: crypto.randomUUID(), name: 'Department', type: 'singleSelect', width: 140, options: ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Operations'] },
        { id: crypto.randomUUID(), name: 'Email', type: 'email', width: 220 },
        { id: crypto.randomUUID(), name: 'Phone', type: 'phone', width: 150 },
        { id: crypto.randomUUID(), name: 'Start date', type: 'date', width: 130 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Emma Johnson', [cols[1].id]: 'Engineering Manager', [cols[2].id]: 'Engineering', [cols[3].id]: 'emma@company.com', [cols[4].id]: '(555) 100-2001' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Liam Chen', [cols[1].id]: 'Product Designer', [cols[2].id]: 'Design', [cols[3].id]: 'liam@company.com', [cols[4].id]: '(555) 100-2002' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Olivia Davis', [cols[1].id]: 'Head of Marketing', [cols[2].id]: 'Marketing', [cols[3].id]: 'olivia@company.com', [cols[4].id]: '(555) 100-2003' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Noah Williams', [cols[1].id]: 'Full Stack Developer', [cols[2].id]: 'Engineering', [cols[3].id]: 'noah@company.com', [cols[4].id]: '(555) 100-2004' },
      ];
      return { title: 'Team directory', columns: cols, rows };
    },
  },
  {
    key: 'onboardingChecklist',
    name: 'Onboarding checklist',
    icon: 'CheckSquare',
    description: 'New hire tasks, deadlines, owners, completion',
    category: 'HR & People',
    tags: ['onboarding', 'checklist', 'new hire'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Task', type: 'text', width: 260 },
        { id: crypto.randomUUID(), name: 'Week', type: 'singleSelect', width: 100, options: ['Week 1', 'Week 2', 'Week 3', 'Week 4'] },
        { id: crypto.randomUUID(), name: 'Owner', type: 'text', width: 140 },
        { id: crypto.randomUUID(), name: 'Done', type: 'checkbox', width: 80 },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 280 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Set up laptop and accounts', [cols[1].id]: 'Week 1', [cols[2].id]: 'IT', [cols[3].id]: true },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Read company handbook', [cols[1].id]: 'Week 1', [cols[2].id]: 'New hire', [cols[3].id]: false },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Meet with team lead', [cols[1].id]: 'Week 1', [cols[2].id]: 'Manager', [cols[3].id]: false },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Complete first small task', [cols[1].id]: 'Week 2', [cols[2].id]: 'Buddy', [cols[3].id]: false },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: '30-day check-in with manager', [cols[1].id]: 'Week 4', [cols[2].id]: 'Manager', [cols[3].id]: false },
      ];
      return { title: 'Onboarding checklist', columns: cols, rows };
    },
  },

  // ── Personal ──────────────────────────────────────────────────────
  {
    key: 'habitTracker',
    name: 'Habit tracker',
    icon: 'Target',
    description: 'Daily habits with frequency, streaks, categories',
    category: 'Personal',
    tags: ['habits', 'goals', 'daily', 'health'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Habit', type: 'text', width: 220 },
        { id: crypto.randomUUID(), name: 'Category', type: 'singleSelect', width: 130, options: ['Health', 'Learning', 'Productivity', 'Mindfulness', 'Social'] },
        { id: crypto.randomUUID(), name: 'Frequency', type: 'singleSelect', width: 120, options: ['Daily', '3x/week', 'Weekly'] },
        { id: crypto.randomUUID(), name: 'Streak', type: 'number', width: 90 },
        { id: crypto.randomUUID(), name: 'Done today', type: 'checkbox', width: 100 },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 240 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Morning run', [cols[1].id]: 'Health', [cols[2].id]: '3x/week', [cols[3].id]: 12, [cols[4].id]: true },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Read 30 minutes', [cols[1].id]: 'Learning', [cols[2].id]: 'Daily', [cols[3].id]: 45, [cols[4].id]: false },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Meditate', [cols[1].id]: 'Mindfulness', [cols[2].id]: 'Daily', [cols[3].id]: 20, [cols[4].id]: true },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Write journal', [cols[1].id]: 'Mindfulness', [cols[2].id]: 'Daily', [cols[3].id]: 8, [cols[4].id]: false },
      ];
      return { title: 'Habit tracker', columns: cols, rows };
    },
  },
  {
    key: 'readingList',
    name: 'Reading list',
    icon: 'BookOpen',
    description: 'Books, status, ratings, genres, notes',
    category: 'Personal',
    tags: ['books', 'reading', 'library'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Title', type: 'text', width: 240 },
        { id: crypto.randomUUID(), name: 'Author', type: 'text', width: 160 },
        { id: crypto.randomUUID(), name: 'Genre', type: 'singleSelect', width: 130, options: ['Fiction', 'Non-fiction', 'Business', 'Science', 'Self-help', 'Biography'] },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 120, options: ['Want to read', 'Reading', 'Finished', 'Abandoned'] },
        { id: crypto.randomUUID(), name: 'Rating', type: 'rating', width: 120 },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 260 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Thinking, Fast and Slow', [cols[1].id]: 'Daniel Kahneman', [cols[2].id]: 'Non-fiction', [cols[3].id]: 'Finished', [cols[4].id]: 5 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'The Pragmatic Programmer', [cols[1].id]: 'David Thomas', [cols[2].id]: 'Business', [cols[3].id]: 'Reading', [cols[4].id]: 4 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Project Hail Mary', [cols[1].id]: 'Andy Weir', [cols[2].id]: 'Fiction', [cols[3].id]: 'Want to read' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Atomic Habits', [cols[1].id]: 'James Clear', [cols[2].id]: 'Self-help', [cols[3].id]: 'Finished', [cols[4].id]: 5 },
      ];
      return { title: 'Reading list', columns: cols, rows };
    },
  },
  {
    key: 'travelPlanner',
    name: 'Travel planner',
    icon: 'Plane',
    description: 'Trips, destinations, dates, budgets, bookings',
    category: 'Personal',
    tags: ['travel', 'trips', 'vacation', 'planning'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Destination', type: 'text', width: 200 },
        { id: crypto.randomUUID(), name: 'Dates', type: 'text', width: 160 },
        { id: crypto.randomUUID(), name: 'Budget', type: 'currency', width: 120 },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 120, options: ['Dreaming', 'Planning', 'Booked', 'Completed'] },
        { id: crypto.randomUUID(), name: 'Flights booked', type: 'checkbox', width: 120 },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 280 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Tokyo, Japan', [cols[1].id]: 'Apr 15 - Apr 28', [cols[2].id]: 4500, [cols[3].id]: 'Booked', [cols[4].id]: true, [cols[5].id]: 'Cherry blossom season, Airbnb in Shibuya' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Barcelona, Spain', [cols[1].id]: 'Jul 1 - Jul 10', [cols[2].id]: 3000, [cols[3].id]: 'Planning', [cols[4].id]: false, [cols[5].id]: 'Need to book hotel near La Rambla' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Iceland road trip', [cols[1].id]: 'Sep 2025', [cols[2].id]: 6000, [cols[3].id]: 'Dreaming', [cols[4].id]: false, [cols[5].id]: 'Ring road, northern lights, hot springs' },
      ];
      return { title: 'Travel planner', columns: cols, rows };
    },
  },

  // ── General ───────────────────────────────────────────────────────
  {
    key: 'eventPlanner',
    name: 'Event planner',
    icon: 'PartyPopper',
    description: 'Plan events with tasks, vendors, timelines',
    category: 'General',
    tags: ['events', 'planning', 'coordination'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Task', type: 'text', width: 240 },
        { id: crypto.randomUUID(), name: 'Category', type: 'singleSelect', width: 130, options: ['Venue', 'Catering', 'Entertainment', 'Logistics', 'Marketing', 'Other'] },
        { id: crypto.randomUUID(), name: 'Owner', type: 'text', width: 140 },
        { id: crypto.randomUUID(), name: 'Due date', type: 'date', width: 130 },
        { id: crypto.randomUUID(), name: 'Status', type: 'singleSelect', width: 120, options: ['Todo', 'In progress', 'Done'] },
        { id: crypto.randomUUID(), name: 'Cost', type: 'currency', width: 110 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Book venue', [cols[1].id]: 'Venue', [cols[2].id]: 'Sarah', [cols[4].id]: 'Done', [cols[5].id]: 2500 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Order catering', [cols[1].id]: 'Catering', [cols[2].id]: 'Mike', [cols[4].id]: 'In progress', [cols[5].id]: 1800 },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Send invitations', [cols[1].id]: 'Marketing', [cols[2].id]: 'Sarah', [cols[4].id]: 'Todo' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Hire DJ', [cols[1].id]: 'Entertainment', [cols[2].id]: 'Mike', [cols[4].id]: 'Todo', [cols[5].id]: 800 },
      ];
      return { title: 'Event planner', columns: cols, rows };
    },
  },
  {
    key: 'prosAndCons',
    name: 'Decision matrix',
    icon: 'Scale',
    description: 'Compare options with weighted criteria and scores',
    category: 'General',
    tags: ['decisions', 'comparison', 'evaluation'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Option', type: 'text', width: 200 },
        { id: crypto.randomUUID(), name: 'Cost', type: 'rating', width: 120 },
        { id: crypto.randomUUID(), name: 'Quality', type: 'rating', width: 120 },
        { id: crypto.randomUUID(), name: 'Speed', type: 'rating', width: 120 },
        { id: crypto.randomUUID(), name: 'Risk', type: 'singleSelect', width: 110, options: ['Low', 'Medium', 'High'] },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 280 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Option A - Build in-house', [cols[1].id]: 2, [cols[2].id]: 5, [cols[3].id]: 2, [cols[4].id]: 'Medium', [cols[5].id]: 'Full control, higher cost' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Option B - Buy SaaS', [cols[1].id]: 4, [cols[2].id]: 3, [cols[3].id]: 5, [cols[4].id]: 'Low', [cols[5].id]: 'Fast to deploy, vendor lock-in' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Option C - Open source', [cols[1].id]: 5, [cols[2].id]: 3, [cols[3].id]: 3, [cols[4].id]: 'Medium', [cols[5].id]: 'Free, but requires maintenance' },
      ];
      return { title: 'Decision matrix', columns: cols, rows };
    },
  },
  {
    key: 'resourceLibrary',
    name: 'Resource library',
    icon: 'Link2',
    description: 'Curated links, tools, articles by topic',
    category: 'General',
    tags: ['resources', 'links', 'bookmarks', 'tools'],
    createData: () => {
      const cols: TableColumn[] = [
        { id: crypto.randomUUID(), name: 'Resource', type: 'text', width: 220 },
        { id: crypto.randomUUID(), name: 'URL', type: 'url', width: 260 },
        { id: crypto.randomUUID(), name: 'Category', type: 'singleSelect', width: 130, options: ['Design', 'Development', 'Marketing', 'Business', 'Learning'] },
        { id: crypto.randomUUID(), name: 'Rating', type: 'rating', width: 120 },
        { id: crypto.randomUUID(), name: 'Notes', type: 'longText', width: 260 },
      ];
      const rows: TableRow[] = [
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Tailwind CSS', [cols[2].id]: 'Development', [cols[3].id]: 5, [cols[4].id]: 'Utility-first CSS framework' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Figma', [cols[2].id]: 'Design', [cols[3].id]: 5, [cols[4].id]: 'Collaborative design tool' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Notion', [cols[2].id]: 'Business', [cols[3].id]: 4, [cols[4].id]: 'All-in-one workspace' },
        { _id: crypto.randomUUID(), _createdAt: new Date().toISOString(), [cols[0].id]: 'Coursera', [cols[2].id]: 'Learning', [cols[3].id]: 4, [cols[4].id]: 'Online courses from top universities' },
      ];
      return { title: 'Resource library', columns: cols, rows };
    },
  },
];
