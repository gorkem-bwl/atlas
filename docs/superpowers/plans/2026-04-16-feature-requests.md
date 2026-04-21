# Feature Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four user-requested features: Quick Actions on dashboards, drag-and-drop Project Board, OCR invoice import from PDF, and multi-source currency conversion with graceful fallback.

**Architecture:** Each feature is self-contained. Quick Actions is a shared component placed on each app's dashboard. Project Board adds a new view to the Work app using native HTML5 drag-and-drop (same pattern as CRM deal-kanban). OCR import uses the existing pdfjs-dist library to extract text from digital PDFs, with tesseract.js as a fallback for scanned documents. Currency conversion adds a server-side service that tries Frankfurter API, then Open Exchange Rates (free tier), then warns the user if both fail. Rates are cached in the DB with a 24-hour TTL.

**Tech Stack:** React, TypeScript, Vite, Express, Drizzle ORM, PostgreSQL, pdfjs-dist, tesseract.js, react-i18next.

---

## Feature 1: Quick Actions

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/client/src/components/shared/quick-actions.tsx` | Create | Shared QuickActions strip component |
| `packages/client/src/apps/crm/components/dashboard.tsx` | Modify | Add CRM quick actions above KPIs |
| `packages/client/src/apps/hr/components/views/dashboard-view.tsx` | Modify | Add HR quick actions above KPIs |
| `packages/client/src/apps/work/components/work-dashboard.tsx` | Modify | Add Work quick actions above KPIs |
| `packages/client/src/apps/invoices/components/invoices-dashboard.tsx` | Modify | Add Invoices quick action above receivables |
| `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json` | Modify | Add quickActions translation keys |

---

### Task 1.1: Create the shared QuickActions component

**Files:**
- Create: `packages/client/src/components/shared/quick-actions.tsx`

- [ ] **Step 1: Create the QuickActions component**

```tsx
import { type ReactNode } from 'react';
import { Button } from '../ui/button';

export interface QuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-lg)',
        flexWrap: 'wrap',
      }}
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="secondary"
          size="sm"
          icon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

---

### Task 1.2: Add QuickActions to CRM dashboard

**Files:**
- Modify: `packages/client/src/apps/crm/components/dashboard.tsx`

The CRM dashboard starts its return JSX at line 262 with `<div className="crm-dashboard">`. The first child is the KPI cards flex container at line 265. Insert QuickActions between line 263 and line 264.

- [ ] **Step 1: Add navigation-based quick actions to CRM dashboard**

Add imports at the top:
```tsx
import { useNavigate } from 'react-router-dom';
import { Plus, UserPlus, Handshake, FileText } from 'lucide-react';
import { QuickActions } from '../../../components/shared/quick-actions';
```

Inside the component, before the return statement:
```tsx
const navigate = useNavigate();

const quickActions = [
  { label: t('crm.quickActions.newLead'), icon: <Plus size={13} />, onClick: () => navigate('/crm?view=leads&action=create') },
  { label: t('crm.quickActions.newDeal'), icon: <Handshake size={13} />, onClick: () => navigate('/crm?view=pipeline&action=create') },
  { label: t('crm.quickActions.newContact'), icon: <UserPlus size={13} />, onClick: () => navigate('/crm?view=contacts&action=create') },
  { label: t('crm.quickActions.newProposal'), icon: <FileText size={13} />, onClick: () => navigate('/crm?view=proposals&action=create') },
];
```

Insert `<QuickActions actions={quickActions} />` as the first child inside `<div className="crm-dashboard">`.

- [ ] **Step 2: Commit**

---

### Task 1.3: Add QuickActions to HR dashboard

**Files:**
- Modify: `packages/client/src/apps/hr/components/views/dashboard-view.tsx`

- [ ] **Step 1: Add quick actions**

Add imports:
```tsx
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Receipt } from 'lucide-react';
import { QuickActions } from '../../../../components/shared/quick-actions';
```

Inside the component:
```tsx
const navigate = useNavigate();

const quickActions = [
  { label: t('hr.quickActions.newEmployee'), icon: <Plus size={13} />, onClick: () => navigate('/hr?view=employees&action=create') },
  { label: t('hr.quickActions.requestTimeOff'), icon: <Clock size={13} />, onClick: () => navigate('/hr?view=time-off&action=create') },
  { label: t('hr.quickActions.newExpense'), icon: <Receipt size={13} />, onClick: () => navigate('/hr?view=expenses&action=create') },
];
```

Insert `<QuickActions actions={quickActions} />` before the KPI grid.

- [ ] **Step 2: Commit**

---

### Task 1.4: Add QuickActions to Work dashboard

**Files:**
- Modify: `packages/client/src/apps/work/components/work-dashboard.tsx`

- [ ] **Step 1: Add quick actions**

Add imports:
```tsx
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, CheckSquare } from 'lucide-react';
import { QuickActions } from '../../../components/shared/quick-actions';
```

Inside the component:
```tsx
const navigate = useNavigate();

const quickActions = [
  { label: t('work.quickActions.newProject'), icon: <Plus size={13} />, onClick: () => navigate('/work?view=projects&action=create') },
  { label: t('work.quickActions.newTask'), icon: <CheckSquare size={13} />, onClick: () => navigate('/work?view=my-tasks&action=create') },
  { label: t('work.quickActions.logTime'), icon: <Clock size={13} />, onClick: () => { document.getElementById('quick-time-log')?.scrollIntoView({ behavior: 'smooth' }); } },
];
```

Also add `id="quick-time-log"` to the QuickTimeLog wrapper div in the same file.

- [ ] **Step 2: Commit**

---

### Task 1.5: Add QuickActions to Invoices dashboard

**Files:**
- Modify: `packages/client/src/apps/invoices/components/invoices-dashboard.tsx`

- [ ] **Step 1: Add quick action**

Add imports:
```tsx
import { Plus } from 'lucide-react';
import { QuickActions } from '../../../components/shared/quick-actions';
```

Add:
```tsx
const quickActions = [
  { label: t('invoices.quickActions.newInvoice'), icon: <Plus size={13} />, onClick: () => navigate('/invoices?view=invoices&action=create') },
];
```

Insert `<QuickActions actions={quickActions} />` at the top of the dashboard layout.

- [ ] **Step 2: Commit**

---

### Task 1.6: Wire action=create param to auto-open creation modals

**IMPORTANT CONTEXT:** Most views (CRM deals/contacts/proposals, HR employees, invoices) do NOT own their create modal state. They receive `onAdd` callbacks from parent page components. The `action=create` wiring must go in the **parent page** files that own the modal state, not the child list views.

**Files:**
- Modify: `packages/client/src/apps/crm/components/leads-view.tsx` — owns `showCreateModal` state (line 387)
- Modify: `packages/client/src/apps/crm/page.tsx` — owns `showCreateDeal` (line 82), `showCreateContact` (line 83); already uses `useSearchParams`
- Modify: `packages/client/src/apps/hr/page.tsx` (or wherever HR create modal state lives) — check for employee/time-off/expense create state
- Modify: `packages/client/src/apps/work/components/projects-list-view.tsx` — owns `createOpen` state (line 122)
- Modify: `packages/client/src/apps/invoices/page.tsx` — owns `showBuilder` state for InvoiceBuilderModal (line 157)

- [ ] **Step 1: Add action=create auto-open to each parent page**

The pattern for each file (adapt state setter name per file):

**CRM leads-view.tsx** (already uses `useSearchParams`):
```tsx
// Add inside component, reuse existing sp:
useEffect(() => {
  if (sp.get('action') === 'create') {
    setShowCreateModal(true);
    sp.delete('action');
    setSp(sp, { replace: true });
  }
}, []);
```

**CRM page.tsx** (already uses `useSearchParams`):
```tsx
// Read the 'action' param from sp. When action=create AND view=pipeline, set showCreateDeal(true).
// When action=create AND view=contacts, set showCreateContact(true).
// When action=create AND view=proposals, trigger the proposal creation flow.
// Then clear the action param.
useEffect(() => {
  const action = sp.get('action');
  const view = sp.get('view');
  if (action === 'create') {
    if (view === 'pipeline') setShowCreateDeal(true);
    else if (view === 'contacts') setShowCreateContact(true);
    // proposals: find how creation is triggered and call it
    sp.delete('action');
    setSp(sp, { replace: true });
  }
}, []);
```

**Work projects-list-view.tsx** (add `useSearchParams`):
```tsx
import { useSearchParams, useNavigate } from 'react-router-dom';
const [sp, setSp] = useSearchParams();
useEffect(() => {
  if (sp.get('action') === 'create') {
    setCreateOpen(true);
    sp.delete('action');
    setSp(sp, { replace: true });
  }
}, []);
```

**Invoices page.tsx** (check existing searchParams usage):
```tsx
// Set showBuilder(true) when action=create, then clear param
useEffect(() => {
  if (sp.get('action') === 'create') {
    setShowBuilder(true); // or whatever the state setter is named
    sp.delete('action');
    setSp(sp, { replace: true });
  }
}, []);
```

**HR page** — read the file first to find where create modal states live for employees, time-off, and expenses. Apply the same pattern.

- [ ] **Step 2: Commit**

---

### Task 1.7: Add translations for all 5 languages

**Files:**
- Modify: `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json`

- [ ] **Step 1: Add quickActions keys to all locale files**

These keys go inside the existing app-level objects in each locale file.

**English:**
```json
"crm.quickActions.newLead": "New lead",
"crm.quickActions.newDeal": "New deal",
"crm.quickActions.newContact": "New contact",
"crm.quickActions.newProposal": "New proposal",
"hr.quickActions.newEmployee": "New employee",
"hr.quickActions.requestTimeOff": "Request time off",
"hr.quickActions.newExpense": "New expense",
"work.quickActions.newProject": "New project",
"work.quickActions.newTask": "New task",
"work.quickActions.logTime": "Log time",
"invoices.quickActions.newInvoice": "New invoice"
```

**Turkish:**
```json
"crm.quickActions.newLead": "Yeni aday",
"crm.quickActions.newDeal": "Yeni anlaşma",
"crm.quickActions.newContact": "Yeni kişi",
"crm.quickActions.newProposal": "Yeni teklif",
"hr.quickActions.newEmployee": "Yeni çalışan",
"hr.quickActions.requestTimeOff": "İzin talebi",
"hr.quickActions.newExpense": "Yeni masraf",
"work.quickActions.newProject": "Yeni proje",
"work.quickActions.newTask": "Yeni görev",
"work.quickActions.logTime": "Süre kaydet",
"invoices.quickActions.newInvoice": "Yeni fatura"
```

**German:**
```json
"crm.quickActions.newLead": "Neuer Lead",
"crm.quickActions.newDeal": "Neues Geschäft",
"crm.quickActions.newContact": "Neuer Kontakt",
"crm.quickActions.newProposal": "Neues Angebot",
"hr.quickActions.newEmployee": "Neuer Mitarbeiter",
"hr.quickActions.requestTimeOff": "Urlaub beantragen",
"hr.quickActions.newExpense": "Neue Ausgabe",
"work.quickActions.newProject": "Neues Projekt",
"work.quickActions.newTask": "Neue Aufgabe",
"work.quickActions.logTime": "Zeit erfassen",
"invoices.quickActions.newInvoice": "Neue Rechnung"
```

**French:**
```json
"crm.quickActions.newLead": "Nouveau prospect",
"crm.quickActions.newDeal": "Nouvelle affaire",
"crm.quickActions.newContact": "Nouveau contact",
"crm.quickActions.newProposal": "Nouvelle proposition",
"hr.quickActions.newEmployee": "Nouvel employé",
"hr.quickActions.requestTimeOff": "Demander un congé",
"hr.quickActions.newExpense": "Nouvelle dépense",
"work.quickActions.newProject": "Nouveau projet",
"work.quickActions.newTask": "Nouvelle tâche",
"work.quickActions.logTime": "Saisir le temps",
"invoices.quickActions.newInvoice": "Nouvelle facture"
```

**Italian:**
```json
"crm.quickActions.newLead": "Nuovo lead",
"crm.quickActions.newDeal": "Nuovo affare",
"crm.quickActions.newContact": "Nuovo contatto",
"crm.quickActions.newProposal": "Nuova proposta",
"hr.quickActions.newEmployee": "Nuovo dipendente",
"hr.quickActions.requestTimeOff": "Richiedi permesso",
"hr.quickActions.newExpense": "Nuova spesa",
"work.quickActions.newProject": "Nuovo progetto",
"work.quickActions.newTask": "Nuovo compito",
"work.quickActions.logTime": "Registra tempo",
"invoices.quickActions.newInvoice": "Nuova fattura"
```

- [ ] **Step 2: Commit**

---

## Feature 2: Drag-and-Drop Project Board

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/client/src/apps/work/components/projects-board-view.tsx` | Create | Kanban board for projects by status |
| `packages/client/src/apps/work/hooks.ts` | Modify | Add useUpdateProjectStatus mutation |
| `packages/client/src/apps/work/page.tsx` | Modify | Add 'board' view type and render board |
| `packages/client/src/apps/work/components/work-sidebar.tsx` | Modify | Add board nav item |
| `packages/client/src/styles/projects.css` | Modify | Add board CSS (follow crm.css kanban pattern) |
| `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json` | Modify | Board translations |

---

### Task 2.1: Add useUpdateProjectStatus mutation hook

**Files:**
- Modify: `packages/client/src/apps/work/hooks.ts`

- [ ] **Step 1: Add the mutation after the existing useUpdateProject hook**

```tsx
export function useUpdateProjectStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/work/projects/${id}`, { status });
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.work.projects.projects.all });
      qc.invalidateQueries({ queryKey: queryKeys.work.projects.dashboard });
    },
  });
}
```

Verify the server's PATCH /work/projects/:id already accepts `status` in the update payload. If not, add it to the server's UpdateProjectInput type.

- [ ] **Step 2: Commit**

---

### Task 2.2: Create the ProjectsBoardView component

**Files:**
- Create: `packages/client/src/apps/work/components/projects-board-view.tsx`

This follows the exact same pattern as `packages/client/src/apps/crm/components/deal-kanban.tsx` -- native HTML5 drag-and-drop with dragenter/dragleave counter tracking.

- [ ] **Step 1: Create the board component**

```tsx
import { useState, useRef, useMemo, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { ContentArea } from '../../../components/ui/content-area';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';
import { useProjects, useUpdateProjectStatus, type WorkProject } from '../hooks';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { formatCurrencyCompact } from '../../../lib/format';

type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

const STATUSES: { id: ProjectStatus; color: string; badgeVariant: 'success' | 'warning' | 'default' }[] = [
  { id: 'active', color: 'var(--color-success)', badgeVariant: 'success' },
  { id: 'paused', color: 'var(--color-warning)', badgeVariant: 'warning' },
  { id: 'completed', color: '#6366f1', badgeVariant: 'default' },
  { id: 'archived', color: 'var(--color-text-tertiary)', badgeVariant: 'default' },
];

export function ProjectsBoardView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useProjects();
  const projects = data?.projects ?? [];
  const updateStatus = useUpdateProjectStatus();
  const { canCreate } = useAppActions('work');

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  const projectsByStatus = useMemo(() => {
    const map: Record<string, WorkProject[]> = {};
    for (const s of STATUSES) map[s.id] = [];
    for (const p of projects) {
      const key = STATUSES.find(s => s.id === p.status) ? p.status : 'active';
      map[key]?.push(p);
    }
    return map;
  }, [projects]);

  const handleDragStart = (e: DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverStatus(null);
    dragCounterRef.current = {};
  };

  const handleDragEnter = (status: string) => {
    dragCounterRef.current[status] = (dragCounterRef.current[status] ?? 0) + 1;
    setDragOverStatus(status);
  };

  const handleDragLeave = (status: string) => {
    dragCounterRef.current[status] = (dragCounterRef.current[status] ?? 0) - 1;
    if ((dragCounterRef.current[status] ?? 0) <= 0) {
      dragCounterRef.current[status] = 0;
      if (dragOverStatus === status) setDragOverStatus(null);
    }
  };

  const handleDrop = (e: DragEvent, targetStatus: string) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('text/plain');
    if (!projectId) return;
    const project = projects.find(p => p.id === projectId);
    if (project && project.status !== targetStatus) {
      updateStatus.mutate({ id: projectId, status: targetStatus });
    }
    handleDragEnd();
  };

  if (isLoading) {
    return (
      <ContentArea title={t('work.board.title')}>
        <div style={{ padding: 'var(--spacing-lg)', color: 'var(--color-text-tertiary)' }}>
          {t('work.loading')}
        </div>
      </ContentArea>
    );
  }

  if (projects.length === 0) {
    return (
      <ContentArea title={t('work.board.title')}>
        <FeatureEmptyState
          illustration="tasks"
          title={t('work.empty.projects')}
          actionLabel={canCreate ? t('work.sidebar.newProject') : undefined}
          actionIcon={canCreate ? <Plus size={13} /> : undefined}
        />
      </ContentArea>
    );
  }

  return (
    <ContentArea title={t('work.board.title')}>
      <div className="work-board">
        {STATUSES.map(({ id: status, color, badgeVariant }) => {
          const statusProjects = projectsByStatus[status] ?? [];
          const isDragOver = dragOverStatus === status;

          return (
            <div
              key={status}
              className={`work-board-column ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => handleDragEnter(status)}
              onDragLeave={() => handleDragLeave(status)}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="work-board-column-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)' }}>
                    {t(`work.board.status.${status}`)}
                  </span>
                  <Badge variant={badgeVariant}>{statusProjects.length}</Badge> {/* Note: Badge has no size prop */}
                </div>
              </div>
              <div className="work-board-cards">
                {statusProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`work-board-card ${draggedId === project.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => navigate(`/work?projectId=${project.id}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: project.color || 'var(--color-text-tertiary)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </span>
                    </div>
                    {project.companyName && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                        {project.companyName}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                      {project.totalHours > 0 && <span>{project.totalHours.toFixed(1)}h</span>}
                      {project.totalAmount > 0 && <span>{formatCurrencyCompact(project.totalAmount)}</span>}
                    </div>
                    {project.budgetHours != null && project.budgetHours > 0 && (
                      <div style={{ marginTop: 'var(--spacing-xs)' }}>
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            borderRadius: 2,
                            background: (project.totalHours / project.budgetHours) > 0.9 ? 'var(--color-error)' : color,
                            width: `${Math.min(100, (project.totalHours / project.budgetHours) * 100)}%`,
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ContentArea>
  );
}
```

- [ ] **Step 2: Commit**

---

### Task 2.3: Add board CSS

**Files:**
- Modify: `packages/client/src/styles/projects.css` (this is the actual CSS file for the Work app -- there is no `work.css`)

- [ ] **Step 1: Append board styles to projects.css**

```css
/* Project Board */

.work-board {
  display: flex;
  gap: var(--spacing-md);
  height: calc(100vh - 120px);
  padding: var(--spacing-md);
  overflow-x: auto;
}

.work-board-column {
  flex: 1;
  min-width: 240px;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-lg);
  border: 2px solid transparent;
  transition: border-color 150ms ease;
}

.work-board-column.drag-over {
  border-color: var(--color-accent-primary);
  background: var(--color-surface-hover);
}

.work-board-column-header {
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.work-board-cards {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--spacing-sm) var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.work-board-card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-secondary);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: grab;
  transition: box-shadow 150ms ease, opacity 150ms ease;
}

.work-board-card:hover {
  box-shadow: var(--shadow-sm);
}

.work-board-card.dragging {
  opacity: 0.4;
}

.work-board-card:active {
  cursor: grabbing;
}
```

- [ ] **Step 2: Commit**

---

### Task 2.4: Wire board view into page and sidebar

**Files:**
- Modify: `packages/client/src/apps/work/page.tsx`
- Modify: `packages/client/src/apps/work/components/work-sidebar.tsx`

- [ ] **Step 1: Add 'board' to page view types**

In `page.tsx`:
```tsx
import { ProjectsBoardView } from './components/projects-board-view';

export type WorkPageView = 'dashboard' | 'projects' | 'board' | 'my-tasks';
const VALID_VIEWS: readonly WorkPageView[] = ['dashboard', 'projects', 'board', 'my-tasks'];
```

Add the view branch in JSX after `view === 'projects'`:
```tsx
) : view === 'board' ? (
  <ProjectsBoardView />
```

- [ ] **Step 2: Add board sidebar item**

In `work-sidebar.tsx`, add import `LayoutGrid` from lucide-react, then add after the Projects SidebarItem:
```tsx
<SidebarItem
  label={t('work.sidebar.board')}
  icon={<LayoutGrid size={15} />}
  isActive={activeView === 'board' && !activeProjectId}
  onClick={() => go('?view=board')}
/>
```

- [ ] **Step 3: Commit**

---

### Task 2.5: Add board translations

**Files:**
- Modify: `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json`

- [ ] **Step 1: Add board keys**

EN: `work.board.title` = "Project board", `work.board.status.active` = "Active", `work.board.status.paused` = "Paused", `work.board.status.completed` = "Completed", `work.board.status.archived` = "Archived", `work.sidebar.board` = "Board"

TR: `work.board.title` = "Proje panosu", `work.board.status.active` = "Aktif", `work.board.status.paused` = "Duraklatilmis", `work.board.status.completed` = "Tamamlandi", `work.board.status.archived` = "Arsivlendi", `work.sidebar.board` = "Pano"

DE: `work.board.title` = "Projektboard", `work.board.status.active` = "Aktiv", `work.board.status.paused` = "Pausiert", `work.board.status.completed` = "Abgeschlossen", `work.board.status.archived` = "Archiviert", `work.sidebar.board` = "Board"

FR: `work.board.title` = "Tableau de projets", `work.board.status.active` = "Actif", `work.board.status.paused` = "En pause", `work.board.status.completed` = "Termine", `work.board.status.archived` = "Archive", `work.sidebar.board` = "Tableau"

IT: `work.board.title` = "Bacheca progetti", `work.board.status.active` = "Attivo", `work.board.status.paused` = "In pausa", `work.board.status.completed` = "Completato", `work.board.status.archived` = "Archiviato", `work.sidebar.board` = "Bacheca"

- [ ] **Step 2: Commit**

---

## Feature 3: OCR Invoice Import

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/client/src/lib/pdf-extract.ts` | Create | PDF text extraction (pdfjs-dist + tesseract.js fallback) |
| `packages/client/src/lib/invoice-parser.ts` | Create | Parse extracted text into structured invoice data |
| `packages/client/src/components/shared/pdf-import-modal.tsx` | Create | Dropzone modal with progress and review stages |
| `packages/client/src/apps/invoices/components/invoices-list-view.tsx` | Modify | Add "Import from PDF" button |
| `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json` | Modify | PDF import translations |
| `packages/client/package.json` | Modify | Add tesseract.js dependency |

---

### Task 3.1: Install tesseract.js

- [ ] **Step 1: Install the dependency**

Run: `cd packages/client && npm install tesseract.js`

Note: pdfjs-dist is already installed.

- [ ] **Step 2: Commit**

---

### Task 3.2: Create PDF text extraction utility

**Files:**
- Create: `packages/client/src/lib/pdf-extract.ts`

First tries pdfjs-dist (fast, works for digital PDFs). Falls back to tesseract.js OCR for scanned/image PDFs when extracted text is under 50 chars.

- [ ] **Step 1: Create the extraction module**

```tsx
import * as pdfjsLib from 'pdfjs-dist';

if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export async function extractTextFromPdf(
  file: File,
  onProgress?: (pct: number, stage: string) => void,
): Promise<{ text: string; method: 'digital' | 'ocr' }> {
  onProgress?.(5, 'reading');
  const arrayBuffer = await file.arrayBuffer();

  // Step 1: Try pdfjs-dist text extraction
  onProgress?.(10, 'extracting');
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(10 + (40 * i) / pdf.numPages, 'extracting');
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item): item is { str: string } => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    pageTexts.push(text);
  }

  const digitalText = pageTexts.join('\n').trim();

  if (digitalText.length > 50) {
    onProgress?.(100, 'done');
    return { text: digitalText, method: 'digital' };
  }

  // Step 2: Fall back to Tesseract.js OCR (dynamic import)
  onProgress?.(55, 'ocr');
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (info) => {
      if (info.status === 'recognizing text' && typeof info.progress === 'number') {
        onProgress?.(55 + info.progress * 40, 'ocr');
      }
    },
  });

  const ocrTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(55 + (40 * i) / pdf.numPages, 'ocr');
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const { data } = await worker.recognize(canvas);
    ocrTexts.push(data.text);
  }

  await worker.terminate();
  onProgress?.(100, 'done');
  return { text: ocrTexts.join('\n').trim(), method: 'ocr' };
}
```

- [ ] **Step 2: Commit**

---

### Task 3.3: Create invoice text parser

**Files:**
- Create: `packages/client/src/lib/invoice-parser.ts`

Parses raw text into structured invoice fields using regex. Looks for dates, totals, line items, vendor info. Supports multi-language keywords (English, Turkish, German, French, Italian).

- [ ] **Step 1: Create the parser**

```tsx
import type { LineItem } from '../components/shared/line-items-editor';

export interface ParsedInvoice {
  vendorName: string | null;
  invoiceNumber: string | null;
  issueDate: string | null;
  dueDate: string | null;
  currency: string | null;
  lineItems: LineItem[];
  subtotal: number | null;
  taxPercent: number | null;
  total: number | null;
  confidence: 'high' | 'medium' | 'low';
}

const DATE_PATTERNS = [
  /(\d{4}-\d{2}-\d{2})/,
  /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/,
];

const CURRENCY_MAP: Record<string, string> = {
  '$': 'USD', 'EUR': 'EUR', 'GBP': 'GBP', 'TRY': 'TRY',
  'JPY': 'JPY', 'CHF': 'CHF', 'CAD': 'CAD', 'AUD': 'AUD',
  'USD': 'USD', 'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK',
  'PLN': 'PLN', 'CZK': 'CZK', 'HUF': 'HUF', 'RON': 'RON',
};

function parseDate(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('-') && match[0].length === 10) return match[0];
      const [, a, b, y] = match;
      const day = parseInt(a), month = parseInt(b);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

function parseCurrency(text: string): string | null {
  for (const [symbol, code] of Object.entries(CURRENCY_MAP)) {
    if (text.includes(symbol)) return code;
  }
  return null;
}

function parseNumber(str: string): number | null {
  const cleaned = str.replace(/\s/g, '');
  if (cleaned.includes('.') && cleaned.includes(',')) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    if (lastComma > lastDot) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(cleaned.replace(/,/g, ''));
  }
  if (cleaned.includes(',')) {
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(cleaned.replace(',', '.'));
    }
    return parseFloat(cleaned.replace(/,/g, ''));
  }
  return parseFloat(cleaned) || null;
}

export function parseInvoiceText(text: string): ParsedInvoice {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let matchCount = 0;

  // Vendor name: first non-numeric line in first 5 lines
  let vendorName: string | null = null;
  for (const line of lines.slice(0, 5)) {
    if (!/^\d/.test(line) && line.length > 2 && line.length < 100) {
      vendorName = line;
      matchCount++;
      break;
    }
  }

  // Invoice number (multi-language keywords)
  let invoiceNumber: string | null = null;
  const invNumMatch = text.match(/(?:invoice|fatura|rechnung|facture|fattura)\s*(?:#|no\.?|num(?:ber|ero)?|nr\.?)\s*[:\s]?\s*([A-Za-z0-9-]+)/i);
  if (invNumMatch) { invoiceNumber = invNumMatch[1]; matchCount++; }

  // Dates
  let issueDate: string | null = null;
  let dueDate: string | null = null;
  const issueDateMatch = text.match(/(?:date|tarih|datum|data)\s*[:\s]\s*(.+)/i);
  if (issueDateMatch) { issueDate = parseDate(issueDateMatch[1]); if (issueDate) matchCount++; }
  const dueDateMatch = text.match(/(?:due\s*date|vade|fallig|echeance|scadenza)\s*[:\s]\s*(.+)/i);
  if (dueDateMatch) { dueDate = parseDate(dueDateMatch[1]); }

  // Currency
  const currency = parseCurrency(text);
  if (currency) matchCount++;

  // Totals
  let total: number | null = null;
  let subtotal: number | null = null;
  let taxPercent: number | null = null;

  const totalMatch = text.match(/(?:total|toplam|gesamt|totale)\s*[:\s]?\s*[^\d]*?([\d.,]+)/i);
  if (totalMatch) { total = parseNumber(totalMatch[1]); if (total) matchCount++; }

  const subtotalMatch = text.match(/(?:subtotal|sub\s*total|ara\s*toplam|zwischensumme|sous-total|subtotale)\s*[:\s]?\s*[^\d]*?([\d.,]+)/i);
  if (subtotalMatch) subtotal = parseNumber(subtotalMatch[1]);

  const taxMatch = text.match(/(?:tax|vat|kdv|mwst|tva|iva)\s*[:\s(%]?\s*([\d.,]+)\s*%?/i);
  if (taxMatch) taxPercent = parseNumber(taxMatch[1]);

  // Line items: qty x price patterns
  const lineItems: LineItem[] = [];
  const lineItemPattern = /(.+?)\s+(\d+)\s*[x]\s*([\d.,]+)/gi;
  let match;
  while ((match = lineItemPattern.exec(text)) !== null) {
    const qty = parseInt(match[2]);
    const price = parseNumber(match[3]);
    if (qty > 0 && price != null) {
      lineItems.push({ id: crypto.randomUUID(), description: match[1].trim(), quantity: qty, unitPrice: price, taxRate: 0 });
      matchCount++;
    }
  }

  const confidence: 'high' | 'medium' | 'low' =
    matchCount >= 5 ? 'high' : matchCount >= 3 ? 'medium' : 'low';

  return {
    vendorName, invoiceNumber, issueDate, dueDate, currency,
    lineItems: lineItems.length > 0 ? lineItems : [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, taxRate: 0 }],
    subtotal, taxPercent, total, confidence,
  };
}
```

- [ ] **Step 2: Commit**

---

### Task 3.4: Create the PDF import modal

**Files:**
- Create: `packages/client/src/components/shared/pdf-import-modal.tsx`

Three stages: (1) dropzone for file upload, (2) processing with progress bar, (3) review extracted data before importing.

- [ ] **Step 1: Create the modal component**

```tsx
import { useState, useCallback, useRef, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { extractTextFromPdf } from '../../lib/pdf-extract';
import { parseInvoiceText, type ParsedInvoice } from '../../lib/invoice-parser';
import type { LineItem } from './line-items-editor';

interface PdfImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: {
    lineItems: LineItem[];
    currency?: string;
    issueDate?: string;
    dueDate?: string;
    taxPercent?: number;
    notes?: string;
  }) => void;
}

type Stage = 'upload' | 'processing' | 'review';

export function PdfImportModal({ open, onClose, onImport }: PdfImportModalProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('upload');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [parsed, setParsed] = useState<ParsedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const reset = () => {
    setStage('upload');
    setProgress(0);
    setProgressLabel('');
    setParsed(null);
    setError(null);
    setIsDragOver(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const processFile = useCallback(async (file: File) => {
    if (!file.type.includes('pdf')) { setError(t('pdfImport.errorNotPdf')); return; }
    if (file.size > 20 * 1024 * 1024) { setError(t('pdfImport.errorTooLarge')); return; }

    setStage('processing');
    setError(null);

    try {
      const { text } = await extractTextFromPdf(file, (pct, stg) => {
        setProgress(pct);
        setProgressLabel(t(`pdfImport.stage.${stg}`));
      });

      if (!text || text.length < 10) { setError(t('pdfImport.errorNoText')); setStage('upload'); return; }

      const result = parseInvoiceText(text);
      setParsed(result);
      setStage('review');
    } catch (err) {
      console.error('PDF extraction failed:', err);
      setError(t('pdfImport.errorExtraction'));
      setStage('upload');
    }
  }, [t]);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = () => {
    if (!parsed) return;
    onImport({
      lineItems: parsed.lineItems,
      currency: parsed.currency ?? undefined,
      issueDate: parsed.issueDate ?? undefined,
      dueDate: parsed.dueDate ?? undefined,
      taxPercent: parsed.taxPercent ?? undefined,
      notes: parsed.vendorName ? t('pdfImport.importedFrom', { vendor: parsed.vendorName }) : undefined,
    });
    handleClose();
  };

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) handleClose(); }} width={540}>
      <Modal.Header title={t('pdfImport.title')} />
      <Modal.Body>
        {stage === 'upload' && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-2xl)',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragOver ? 'var(--color-surface-hover)' : 'transparent',
                transition: 'all 150ms ease',
              }}
            >
              <Upload size={32} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-sm)' }} />
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                {t('pdfImport.dropzone')}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                {t('pdfImport.dropzoneHint')}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>
            {error && (
              <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-error)', fontSize: 'var(--font-size-sm)' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>
        )}

        {stage === 'processing' && (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl) 0' }}>
            <FileText size={32} style={{ color: 'var(--color-accent-primary)', marginBottom: 'var(--spacing-md)' }} />
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              {progressLabel}
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--color-bg-tertiary)', overflow: 'hidden', maxWidth: 300, margin: '0 auto' }}>
              <div style={{ height: '100%', borderRadius: 2, background: 'var(--color-accent-primary)', width: `${progress}%`, transition: 'width 200ms ease' }} />
            </div>
          </div>
        )}

        {stage === 'review' && parsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{t('pdfImport.extracted')}</span>
              <Badge variant={parsed.confidence === 'high' ? 'success' : parsed.confidence === 'medium' ? 'warning' : 'error'}>
                {t(`pdfImport.confidence.${parsed.confidence}`)}
              </Badge>
            </div>

            {parsed.vendorName && (
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{t('pdfImport.vendor')}</label>
                <div style={{ fontSize: 'var(--font-size-sm)' }}>{parsed.vendorName}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              {parsed.invoiceNumber && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{t('pdfImport.invoiceNumber')}</label>
                  <div style={{ fontSize: 'var(--font-size-sm)' }}>{parsed.invoiceNumber}</div>
                </div>
              )}
              {parsed.currency && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{t('pdfImport.currency')}</label>
                  <div style={{ fontSize: 'var(--font-size-sm)' }}>{parsed.currency}</div>
                </div>
              )}
            </div>

            {parsed.lineItems.length > 0 && parsed.lineItems[0].description && (
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--spacing-xs)' }}>
                  {t('pdfImport.lineItems', { count: parsed.lineItems.length })}
                </label>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', maxHeight: 120, overflowY: 'auto', border: '1px solid var(--color-border-secondary)', borderRadius: 'var(--radius-sm)', padding: 'var(--spacing-sm)' }}>
                  {parsed.lineItems.map((item, i) => (
                    <div key={item.id} style={{ padding: '2px 0', borderBottom: i < parsed.lineItems.length - 1 ? '1px solid var(--color-border-secondary)' : 'none' }}>
                      {item.description} - {item.quantity} x {item.unitPrice}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.total != null && (
              <div>
                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginBottom: 2 }}>{t('pdfImport.total')}</label>
                <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}>
                  {parsed.currency ?? '$'}{parsed.total.toFixed(2)}
                </div>
              </div>
            )}

            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              {t('pdfImport.reviewHint')}
            </div>
          </div>
        )}
      </Modal.Body>
      {stage === 'review' && (
        <Modal.Footer>
          <Button variant="ghost" size="sm" onClick={reset}>{t('pdfImport.tryAnother')}</Button>
          <Button variant="primary" size="sm" onClick={handleImport}>{t('pdfImport.importToInvoice')}</Button>
        </Modal.Footer>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

---

### Task 3.5: Wire PDF import into invoice list view

**Files:**
- Modify: `packages/client/src/apps/invoices/components/invoices-list-view.tsx`

- [ ] **Step 1: Add import button to toolbar**

Add imports:
```tsx
import { FileUp } from 'lucide-react';
import { PdfImportModal } from '../../../components/shared/pdf-import-modal';
```

Add state:
```tsx
const [pdfImportOpen, setPdfImportOpen] = useState(false);
const [importPrefill, setImportPrefill] = useState<{ lineItems?: LineItem[]; currency?: string } | undefined>();
```

Add button in the actions/toolbar area next to the existing "New invoice" button:
```tsx
<Button variant="secondary" size="sm" icon={<FileUp size={13} />} onClick={() => setPdfImportOpen(true)}>
  {t('invoices.importPdf')}
</Button>
```

Add modal rendering:
```tsx
<PdfImportModal
  open={pdfImportOpen}
  onClose={() => setPdfImportOpen(false)}
  onImport={(data) => {
    setImportPrefill({ lineItems: data.lineItems, currency: data.currency });
    setCreateOpen(true);
  }}
/>
```

Pass `prefill={importPrefill}` to the InvoiceBuilderModal and clear `importPrefill` when the builder closes.

- [ ] **Step 2: Commit**

---

### Task 3.6: Add PDF import translations

**Files:**
- Modify: `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json`

- [ ] **Step 1: Add pdfImport keys**

EN:
- `pdfImport.title` = "Import from PDF"
- `pdfImport.dropzone` = "Drop a PDF invoice here, or click to browse"
- `pdfImport.dropzoneHint` = "Supports digital and scanned PDFs (max 20 MB)"
- `pdfImport.errorNotPdf` = "Please select a PDF file"
- `pdfImport.errorTooLarge` = "File is too large (max 20 MB)"
- `pdfImport.errorNoText` = "Could not extract text from this PDF"
- `pdfImport.errorExtraction` = "Failed to process the PDF"
- `pdfImport.stage.reading` = "Reading file..."
- `pdfImport.stage.extracting` = "Extracting text..."
- `pdfImport.stage.ocr` = "Running OCR (this may take a moment)..."
- `pdfImport.stage.done` = "Done"
- `pdfImport.extracted` = "Data extracted"
- `pdfImport.confidence.high` = "High confidence"
- `pdfImport.confidence.medium` = "Medium confidence"
- `pdfImport.confidence.low` = "Low confidence"
- `pdfImport.vendor` = "Vendor"
- `pdfImport.invoiceNumber` = "Invoice number"
- `pdfImport.currency` = "Currency"
- `pdfImport.lineItems` = "{{count}} line item(s)"
- `pdfImport.total` = "Total"
- `pdfImport.reviewHint` = "Review the data above. You can edit everything in the invoice form after importing."
- `pdfImport.tryAnother` = "Try another file"
- `pdfImport.importToInvoice` = "Import to invoice"
- `pdfImport.importedFrom` = "Imported from {{vendor}}"
- `invoices.importPdf` = "Import from PDF"

TR:
- `pdfImport.title` = "PDF'den ice aktar"
- `pdfImport.dropzone` = "Bir PDF fatura buraya surukleyin veya tiklayarak secin"
- `pdfImport.dropzoneHint` = "Dijital ve taranmis PDF'ler desteklenir (maks 20 MB)"
- `pdfImport.errorNotPdf` = "Lutfen bir PDF dosyasi secin"
- `pdfImport.errorTooLarge` = "Dosya cok buyuk (maks 20 MB)"
- `pdfImport.errorNoText` = "Bu PDF'den metin cikarilamadi"
- `pdfImport.errorExtraction` = "PDF islenirken hata olustu"
- `pdfImport.stage.reading` = "Dosya okunuyor..."
- `pdfImport.stage.extracting` = "Metin cikariliyor..."
- `pdfImport.stage.ocr` = "OCR calisiyor (biraz surebilir)..."
- `pdfImport.stage.done` = "Tamamlandi"
- `pdfImport.extracted` = "Veri cikarildi"
- `pdfImport.confidence.high` = "Yuksek dogruluk"
- `pdfImport.confidence.medium` = "Orta dogruluk"
- `pdfImport.confidence.low` = "Dusuk dogruluk"
- `pdfImport.vendor` = "Tedarikci"
- `pdfImport.invoiceNumber` = "Fatura numarasi"
- `pdfImport.currency` = "Para birimi"
- `pdfImport.lineItems` = "{{count}} kalem"
- `pdfImport.total` = "Toplam"
- `pdfImport.reviewHint` = "Yukaridaki verileri gozden gecirin. Ice aktardiktan sonra fatura formunda duzenleyebilirsiniz."
- `pdfImport.tryAnother` = "Baska dosya dene"
- `pdfImport.importToInvoice` = "Faturaya aktar"
- `pdfImport.importedFrom` = "{{vendor}} kaynakli ice aktarildi"
- `invoices.importPdf` = "PDF'den ice aktar"

DE:
- `pdfImport.title` = "Aus PDF importieren"
- `pdfImport.dropzone` = "PDF-Rechnung hierher ziehen oder klicken"
- `pdfImport.dropzoneHint` = "Digitale und gescannte PDFs (max 20 MB)"
- `pdfImport.errorNotPdf` = "Bitte eine PDF-Datei auswahlen"
- `pdfImport.errorTooLarge` = "Datei zu gross (max 20 MB)"
- `pdfImport.errorNoText` = "Text konnte nicht extrahiert werden"
- `pdfImport.errorExtraction` = "PDF konnte nicht verarbeitet werden"
- `pdfImport.stage.reading` = "Datei wird gelesen..."
- `pdfImport.stage.extracting` = "Text wird extrahiert..."
- `pdfImport.stage.ocr` = "OCR lauft..."
- `pdfImport.stage.done` = "Fertig"
- `pdfImport.extracted` = "Daten extrahiert"
- `pdfImport.confidence.high` = "Hohe Genauigkeit"
- `pdfImport.confidence.medium` = "Mittlere Genauigkeit"
- `pdfImport.confidence.low` = "Geringe Genauigkeit"
- `pdfImport.vendor` = "Lieferant"
- `pdfImport.invoiceNumber` = "Rechnungsnummer"
- `pdfImport.currency` = "Wahrung"
- `pdfImport.lineItems` = "{{count}} Position(en)"
- `pdfImport.total` = "Gesamt"
- `pdfImport.reviewHint` = "Daten uberprufen. Nach dem Import alles im Formular bearbeitbar."
- `pdfImport.tryAnother` = "Andere Datei versuchen"
- `pdfImport.importToInvoice` = "In Rechnung importieren"
- `pdfImport.importedFrom` = "Importiert von {{vendor}}"
- `invoices.importPdf` = "Aus PDF importieren"

FR:
- `pdfImport.title` = "Importer depuis un PDF"
- `pdfImport.dropzone` = "Deposez une facture PDF ici ou cliquez"
- `pdfImport.dropzoneHint` = "PDF numeriques et scannes (max 20 Mo)"
- `pdfImport.errorNotPdf` = "Veuillez selectionner un fichier PDF"
- `pdfImport.errorTooLarge` = "Fichier trop volumineux (max 20 Mo)"
- `pdfImport.errorNoText` = "Impossible d'extraire le texte"
- `pdfImport.errorExtraction` = "Echec du traitement du PDF"
- `pdfImport.stage.reading` = "Lecture du fichier..."
- `pdfImport.stage.extracting` = "Extraction du texte..."
- `pdfImport.stage.ocr` = "OCR en cours..."
- `pdfImport.stage.done` = "Termine"
- `pdfImport.extracted` = "Donnees extraites"
- `pdfImport.confidence.high` = "Haute fiabilite"
- `pdfImport.confidence.medium` = "Fiabilite moyenne"
- `pdfImport.confidence.low` = "Faible fiabilite"
- `pdfImport.vendor` = "Fournisseur"
- `pdfImport.invoiceNumber` = "Numero de facture"
- `pdfImport.currency` = "Devise"
- `pdfImport.lineItems` = "{{count}} ligne(s)"
- `pdfImport.total` = "Total"
- `pdfImport.reviewHint` = "Verifiez les donnees. Tout est modifiable apres importation."
- `pdfImport.tryAnother` = "Essayer un autre fichier"
- `pdfImport.importToInvoice` = "Importer dans la facture"
- `pdfImport.importedFrom` = "Importe depuis {{vendor}}"
- `invoices.importPdf` = "Importer depuis un PDF"

IT:
- `pdfImport.title` = "Importa da PDF"
- `pdfImport.dropzone` = "Trascina qui una fattura PDF o clicca"
- `pdfImport.dropzoneHint` = "PDF digitali e scansionati (max 20 MB)"
- `pdfImport.errorNotPdf` = "Seleziona un file PDF"
- `pdfImport.errorTooLarge` = "File troppo grande (max 20 MB)"
- `pdfImport.errorNoText` = "Impossibile estrarre il testo"
- `pdfImport.errorExtraction` = "Elaborazione non riuscita"
- `pdfImport.stage.reading` = "Lettura del file..."
- `pdfImport.stage.extracting` = "Estrazione del testo..."
- `pdfImport.stage.ocr` = "OCR in corso..."
- `pdfImport.stage.done` = "Completato"
- `pdfImport.extracted` = "Dati estratti"
- `pdfImport.confidence.high` = "Alta affidabilita"
- `pdfImport.confidence.medium` = "Media affidabilita"
- `pdfImport.confidence.low` = "Bassa affidabilita"
- `pdfImport.vendor` = "Fornitore"
- `pdfImport.invoiceNumber` = "Numero fattura"
- `pdfImport.currency` = "Valuta"
- `pdfImport.lineItems` = "{{count}} voce/i"
- `pdfImport.total` = "Totale"
- `pdfImport.reviewHint` = "Verifica i dati. Tutto modificabile dopo l'importazione."
- `pdfImport.tryAnother` = "Prova un altro file"
- `pdfImport.importToInvoice` = "Importa nella fattura"
- `pdfImport.importedFrom` = "Importato da {{vendor}}"
- `invoices.importPdf` = "Importa da PDF"

- [ ] **Step 2: Commit**

---

## Feature 4: Currency Conversion

### File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/server/src/db/schema.ts` | Modify | Add exchange_rates table + currency column to crm_deals |
| `packages/server/src/services/exchange-rate.service.ts` | Create | Multi-provider rate fetching with fallback + DB cache |
| `packages/server/src/routes/exchange-rate.routes.ts` | Create | Express routes for rate endpoints |
| `packages/server/src/routes/index.ts` | Modify | Mount exchange rate routes (this is where all route groups are mounted, NOT src/index.ts) |
| `packages/client/src/hooks/use-exchange-rates.ts` | Create | React Query hook for conversion |
| `packages/client/src/components/shared/currency-converter.tsx` | Create | Inline conversion display component |
| `packages/client/src/components/shared/invoice-builder-modal.tsx` | Modify | Show conversion below total |
| `packages/client/src/apps/crm/components/proposal-editor.tsx` | Modify | Show conversion below total |
| `packages/client/src/components/settings/formats-panel.tsx` | Modify | Add base currency selector |
| `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json` | Modify | Currency translations |

---

### Task 4.1: Add exchange_rates table and currency column to deals

**Files:**
- Modify: `packages/server/src/db/schema.ts`

- [ ] **Step 1: Add the exchange_rates cache table**

Near the other utility tables:
```typescript
export const exchangeRates = pgTable('exchange_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  baseCurrency: varchar('base_currency', { length: 10 }).notNull(),
  targetCurrency: varchar('target_currency', { length: 10 }).notNull(),
  rate: real('rate').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Add currency column to crm_deals**

After the `value` column in `crmDeals`:
```typescript
currency: varchar('currency', { length: 10 }).notNull().default('USD'),
```

- [ ] **Step 3: Push schema**

Run: `cd packages/server && npm run db:push`

- [ ] **Step 4: Commit**

---

### Task 4.2: Create the exchange rate service

**Files:**
- Create: `packages/server/src/services/exchange-rate.service.ts`

Three providers: Frankfurter (ECB, free), Open Exchange Rates (free tier), stale cache fallback. 24-hour cache TTL.

- [ ] **Step 1: Create the service**

```typescript
import { db } from '../db';
import { exchangeRates } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { logger } from '../lib/logger';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface RateResult {
  rate: number;
  provider: string;
  cached: boolean;
}

async function fetchFromFrankfurter(base: string, target: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${target}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.rates?.[target] ?? null;
  } catch (err) {
    logger.warn({ err, base, target }, 'Frankfurter API failed');
    return null;
  }
}

async function fetchFromOpenER(base: string, target: string): Promise<number | null> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.rates?.[target] ?? null;
  } catch (err) {
    logger.warn({ err, base, target }, 'Open Exchange Rates API failed');
    return null;
  }
}

export async function getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<RateResult | null> {
  const base = baseCurrency.toUpperCase();
  const target = targetCurrency.toUpperCase();

  if (base === target) return { rate: 1, provider: 'identity', cached: true };

  // Check fresh cache
  const cutoff = new Date(Date.now() - CACHE_TTL_MS);
  const [cached] = await db
    .select().from(exchangeRates)
    .where(and(eq(exchangeRates.baseCurrency, base), eq(exchangeRates.targetCurrency, target), gt(exchangeRates.fetchedAt, cutoff)))
    .orderBy(exchangeRates.fetchedAt)
    .limit(1);

  if (cached) return { rate: cached.rate, provider: cached.provider, cached: true };

  // Try providers
  const providers = [
    { name: 'frankfurter', fn: () => fetchFromFrankfurter(base, target) },
    { name: 'open-er', fn: () => fetchFromOpenER(base, target) },
  ];

  for (const { name, fn } of providers) {
    const rate = await fn();
    if (rate != null && rate > 0) {
      await db.insert(exchangeRates).values({ baseCurrency: base, targetCurrency: target, rate, provider: name });
      return { rate, provider: name, cached: false };
    }
  }

  // Stale cache fallback (any age)
  const [stale] = await db
    .select().from(exchangeRates)
    .where(and(eq(exchangeRates.baseCurrency, base), eq(exchangeRates.targetCurrency, target)))
    .orderBy(exchangeRates.fetchedAt)
    .limit(1);

  if (stale) {
    logger.warn({ base, target }, 'Using stale exchange rate');
    return { rate: stale.rate, provider: `${stale.provider} (stale)`, cached: true };
  }

  logger.error({ base, target }, 'All exchange rate providers failed');
  return null;
}

export async function getExchangeRates(baseCurrency: string, targetCurrencies: string[]): Promise<Record<string, RateResult | null>> {
  const results: Record<string, RateResult | null> = {};
  await Promise.all(targetCurrencies.map(async (target) => { results[target] = await getExchangeRate(baseCurrency, target); }));
  return results;
}
```

- [ ] **Step 2: Commit**

---

### Task 4.3: Create exchange rate API routes

**Files:**
- Create: `packages/server/src/routes/exchange-rate.routes.ts`
- Modify: server main router to mount the routes

- [ ] **Step 1: Create routes**

```typescript
import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getExchangeRate, getExchangeRates } from '../services/exchange-rate.service';

const router = Router();

router.get('/convert', authMiddleware, async (req: Request, res: Response) => {
  const from = (req.query.from as string)?.toUpperCase();
  const to = (req.query.to as string)?.toUpperCase();
  const amount = parseFloat(req.query.amount as string) || 1;

  if (!from || !to) return res.status(400).json({ success: false, error: 'Missing from or to currency' });

  const result = await getExchangeRate(from, to);
  if (!result) return res.status(503).json({ success: false, error: 'Exchange rate unavailable', code: 'RATE_UNAVAILABLE' });

  res.json({
    success: true,
    data: { from, to, rate: result.rate, amount, converted: Math.round(amount * result.rate * 100) / 100, provider: result.provider, cached: result.cached },
  });
});

router.get('/rates', authMiddleware, async (req: Request, res: Response) => {
  const base = (req.query.base as string)?.toUpperCase();
  const targets = (req.query.targets as string)?.split(',').map(t => t.trim().toUpperCase());

  if (!base || !targets?.length) return res.status(400).json({ success: false, error: 'Missing base or targets' });

  const results = await getExchangeRates(base, targets);
  res.json({
    success: true,
    data: { base, rates: Object.fromEntries(Object.entries(results).map(([c, r]) => [c, r ? { rate: r.rate, provider: r.provider } : null])) },
  });
});

export { router as exchangeRateRoutes };
```

- [ ] **Step 2: Mount in server routes/index.ts**

Routes are mounted in `packages/server/src/routes/index.ts` (NOT `src/index.ts`). App routes use `serverAppRegistry.mountAll(router)` at line 44. Add the exchange rate routes BEFORE the registry mount:

```typescript
import { exchangeRateRoutes } from './exchange-rate.routes';
// Add before serverAppRegistry.mountAll(router):
router.use('/exchange-rates', exchangeRateRoutes);
```

- [ ] **Step 3: Commit**

---

### Task 4.4: Create client-side hook and CurrencyConverter component

**Files:**
- Create: `packages/client/src/hooks/use-exchange-rates.ts`
- Create: `packages/client/src/components/shared/currency-converter.tsx`

- [ ] **Step 1: Create the hook**

```tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface ConversionResult {
  from: string;
  to: string;
  rate: number;
  amount: number;
  converted: number;
  provider: string;
  cached: boolean;
}

export function useConvertCurrency(from: string | undefined, to: string | undefined, amount: number) {
  return useQuery({
    queryKey: ['exchange-rates', 'convert', from, to, amount],
    queryFn: async () => {
      const { data } = await api.get('/exchange-rates/convert', { params: { from, to, amount } });
      return data.data as ConversionResult;
    },
    enabled: !!from && !!to && from !== to && amount > 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
```

- [ ] **Step 2: Create the display component**

```tsx
import { useTranslation } from 'react-i18next';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useConvertCurrency } from '../../hooks/use-exchange-rates';
import { Tooltip } from '../ui/tooltip';

interface CurrencyConverterProps {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
}

export function CurrencyConverter({ amount, fromCurrency, toCurrency }: CurrencyConverterProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useConvertCurrency(fromCurrency, toCurrency, amount);

  if (fromCurrency === toCurrency || amount <= 0) return null;

  if (isLoading) {
    return (
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <RefreshCw size={10} className="spin" /> {t('currency.converting')}
      </span>
    );
  }

  if (isError || !data) {
    return (
      <Tooltip content={t('currency.unavailableTooltip')}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
          <AlertTriangle size={10} /> {t('currency.unavailable')}
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={t('currency.rateInfo', { rate: data.rate.toFixed(4), provider: data.provider })}>
      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', cursor: 'help' }}>
        = {data.converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {toCurrency}
      </span>
    </Tooltip>
  );
}
```

- [ ] **Step 3: Commit**

---

### Task 4.5: Wire conversion into invoice builder and proposal editor

**Files:**
- Modify: `packages/client/src/components/shared/invoice-builder-modal.tsx`
- Modify: `packages/client/src/apps/crm/components/proposal-editor.tsx`

- [ ] **Step 1: Add CurrencyConverter to invoice builder**

Import:
```tsx
import { CurrencyConverter } from './currency-converter';
```

After the TotalsBlock rendering, add:
```tsx
<CurrencyConverter amount={total} fromCurrency={currency} toCurrency={invoiceSettings?.defaultCurrency ?? 'USD'} />
```

- [ ] **Step 2: Add CurrencyConverter to proposal editor**

Import:
```tsx
import { CurrencyConverter } from '../../../components/shared/currency-converter';
import { useInvoiceSettings } from '../../invoices/hooks';
```

Inside the component:
```tsx
const { data: invoiceSettings } = useInvoiceSettings();
```

After the TotalsBlock:
```tsx
<CurrencyConverter amount={total} fromCurrency={currency} toCurrency={invoiceSettings?.defaultCurrency ?? 'USD'} />
```

- [ ] **Step 3: Commit**

---

### Task 4.6: Add base currency selector to settings

**Files:**
- Modify: `packages/client/src/components/settings/formats-panel.tsx`

- [ ] **Step 1: Add base currency dropdown**

Read formats-panel.tsx to understand current layout. Near the existing `currencySymbol` setting, add a `Select` for base currency:

```tsx
const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'TRY', label: 'TRY - Turkish Lira' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CHF', label: 'CHF - Swiss Franc' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'SEK', label: 'SEK - Swedish Krona' },
  { value: 'NOK', label: 'NOK - Norwegian Krone' },
  { value: 'DKK', label: 'DKK - Danish Krone' },
  { value: 'PLN', label: 'PLN - Polish Zloty' },
  { value: 'CZK', label: 'CZK - Czech Koruna' },
  { value: 'HUF', label: 'HUF - Hungarian Forint' },
  { value: 'RON', label: 'RON - Romanian Leu' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'BRL', label: 'BRL - Brazilian Real' },
];
```

Use `useInvoiceSettings` and `useUpdateInvoiceSettings` to read/write `defaultCurrency`. Render with label `t('settings.formats.baseCurrency')`.

- [ ] **Step 2: Commit**

---

### Task 4.7: Add currency conversion translations

**Files:**
- Modify: `packages/client/src/i18n/locales/{en,tr,de,fr,it}.json`

- [ ] **Step 1: Add currency keys**

EN:
- `currency.converting` = "Converting..."
- `currency.unavailable` = "Rate unavailable"
- `currency.unavailableTooltip` = "Exchange rate services are temporarily unavailable. Amounts shown in original currency only."
- `currency.rateInfo` = "Rate: {{rate}} (via {{provider}})"
- `settings.formats.baseCurrency` = "Base currency"
- `settings.formats.baseCurrencyHint` = "Your primary currency. Conversion rates shown relative to this."

TR:
- `currency.converting` = "Donusturuluyor..."
- `currency.unavailable` = "Kur bilgisi yok"
- `currency.unavailableTooltip` = "Doviz kuru servisleri gecici olarak kullanilamiyor. Tutarlar yalnizca orijinal para biriminde."
- `currency.rateInfo` = "Kur: {{rate}} ({{provider}} uzerinden)"
- `settings.formats.baseCurrency` = "Ana para birimi"
- `settings.formats.baseCurrencyHint` = "Birincil para biriminiz. Donusum kurlari buna gore gosterilecektir."

DE:
- `currency.converting` = "Wird umgerechnet..."
- `currency.unavailable` = "Kurs nicht verfugbar"
- `currency.unavailableTooltip` = "Wechselkursdienste vorubergehend nicht verfugbar."
- `currency.rateInfo` = "Kurs: {{rate}} (uber {{provider}})"
- `settings.formats.baseCurrency` = "Basiswahrung"
- `settings.formats.baseCurrencyHint` = "Ihre Hauptwahrung."

FR:
- `currency.converting` = "Conversion en cours..."
- `currency.unavailable` = "Taux indisponible"
- `currency.unavailableTooltip` = "Les services de taux sont temporairement indisponibles."
- `currency.rateInfo` = "Taux : {{rate}} (via {{provider}})"
- `settings.formats.baseCurrency` = "Devise de base"
- `settings.formats.baseCurrencyHint` = "Votre devise principale."

IT:
- `currency.converting` = "Conversione in corso..."
- `currency.unavailable` = "Tasso non disponibile"
- `currency.unavailableTooltip` = "I servizi di cambio sono temporaneamente non disponibili."
- `currency.rateInfo` = "Tasso: {{rate}} (tramite {{provider}})"
- `settings.formats.baseCurrency` = "Valuta base"
- `settings.formats.baseCurrencyHint` = "La tua valuta principale."

- [ ] **Step 2: Commit**

---

## Summary

| Feature | Tasks | New files | Modified files |
|---------|-------|-----------|----------------|
| 1. Quick Actions | 1.1-1.7 | 1 | 5 + 5 locale + 7 views |
| 2. Project Board | 2.1-2.5 | 1 | 4 + 5 locale |
| 3. OCR Import | 3.1-3.6 | 3 | 1 + 5 locale + package.json |
| 4. Currency Conversion | 4.1-4.7 | 4 | 5 + 5 locale |
