import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Inbox, Star, Calendar, Coffee,
  CircleDot, Moon, X, Trash2,
  LayoutList, LayoutGrid, Table2, User,
  Eye, Users, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown,
  Group as GroupIcon, Check, ChevronDown, Flag, FolderKanban, Tag as TagIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTaskList, useUpdateTask, useDeleteTask, useBulkDeleteTasks,
  useTaskProjectList, useReorderTasks,
  useBlockedTaskIds, useTaskCounts,
} from '../hooks';
import { queryKeys } from '../../../config/query-keys';
import type { Task, TaskWhen, TaskPriority, TaskStatus } from '@atlas-platform/shared';
import { isDoneStatus } from '@atlas-platform/shared';
import { ContentArea } from '../../../components/ui/content-area';
import { useTasksSettingsStore } from '../settings-store';
import type { TaskSortOrder } from '../settings-store';
import { useAuthStore } from '../../../stores/auth-store';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { useTenantUsers } from '../../../hooks/use-platform';
import { Button } from '../../../components/ui/button';
import { IconButton } from '../../../components/ui/icon-button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { QueryErrorState } from '../../../components/ui/query-error-state';
import { Popover, PopoverTrigger, PopoverContent } from '../../../components/ui/popover';
import { getTodayStr, isInputFocused } from '../lib/helpers';
import { PRIORITY_OPTIONS, normalizePriority } from '../lib/constants';
import { TaskItem } from './task-item';
import { CalendarView } from './calendar-view';
import { TaskDetailPanel } from './task-detail-panel';
import { KanbanBoard } from './kanban-board';
import { TaskListView } from './task-list-view';
import { TaskTableView } from './task-table-view';
import '../../../styles/tasks.css';

export type WorkView = 'my' | 'assigned' | 'created' | 'all' | `project:${string}`;

interface Props {
  view: WorkView;
  title: string;
  initialViewMode?: 'list' | 'board' | 'table' | 'calendar';
}

// ─── Filter / sort / group types ─────────────────────────────────────

type DueFilter = 'overdue' | 'today' | 'week' | 'none';
type GroupBy = 'none' | 'status' | 'priority' | 'project' | 'assignee' | 'due';
type SortBy = TaskSortOrder; // 'manual' | 'priority' | 'dueDate' | 'title' | 'created'
type SortDir = 'asc' | 'desc';
const UNASSIGNED = '__unassigned__';
const NO_TAG = '__none__';

// urgent ranks above high so synced urgent tasks sort to the top, even
// though they display as High (via normalizePriority) everywhere else.
const PRIORITY_RANK: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1, none: 0 };

// ─── Multi-select filter popover ─────────────────────────────────────

interface FilterOption { value: string; label: string; color?: string }

function MultiSelectFilter({
  icon, label, options, selected, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  options: FilterOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = selected.size > 0;
  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value); else next.add(value);
    onChange(next);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="tasks-filter-trigger"
          data-active={active ? 'true' : undefined}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 8px', borderRadius: 'var(--radius-md)',
            border: `1px solid ${active ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)'}`,
            background: active ? 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)' : 'transparent',
            color: active ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family)', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {icon}
          {label}
          {active && <span style={{ fontWeight: 600 }}>· {selected.size}</span>}
          <ChevronDown size={11} />
        </button>
      </PopoverTrigger>
      <PopoverContent minWidth={180} style={{ padding: 4, maxHeight: 320, overflowY: 'auto' }}>
        {options.length === 0 ? (
          <div style={{ padding: '6px 8px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>—</div>
        ) : options.map((opt) => {
          const checked = selected.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '6px 8px', border: 'none', background: 'transparent',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {checked && <Check size={13} color="var(--color-accent-primary)" />}
              </span>
              {opt.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// ─── URL search-param helpers (CSV for multi-selects) ─────────────────

const parseSet = (sp: URLSearchParams, key: string): Set<string> => {
  const raw = sp.get(key);
  return new Set(raw ? raw.split(',').filter(Boolean) : []);
};

export function WorkTasksView({ view, title, initialViewMode }: Props) {
  const { t } = useTranslation();

  const { canCreate, canDelete } = useAppActions('work');

  const { account, tenantId } = useAuthStore();
  const currentUserId = account?.userId;
  const { data: tenantMembers } = useTenantUsers(tenantId ?? undefined);

  const tasksSettings = useTasksSettingsStore();

  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'mine' | 'team'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'table' | 'calendar'>(initialViewMode || tasksSettings.viewMode || 'list');
  const canShowBoard = view === 'my';

  // ── Filter / sort / group state (initialized from URL) ──
  const [statusFilter, setStatusFilter] = useState<Set<string>>(() => parseSet(searchParams, 'status'));
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(() => parseSet(searchParams, 'priority'));
  const [projectFilter, setProjectFilter] = useState<Set<string>>(() => parseSet(searchParams, 'project'));
  const [assigneeFilter, setAssigneeFilter] = useState<Set<string>>(() => parseSet(searchParams, 'assignee'));
  const [dueFilter, setDueFilter] = useState<Set<string>>(() => parseSet(searchParams, 'due'));
  const [tagFilter, setTagFilter] = useState<Set<string>>(() => parseSet(searchParams, 'tags'));
  const [sortBy, setSortBy] = useState<SortBy>(() => (searchParams.get('sort') as SortBy) || tasksSettings.defaultSortOrder || 'manual');
  const [sortDir, setSortDir] = useState<SortDir>(() => (searchParams.get('dir') === 'desc' ? 'desc' : 'asc'));
  const [groupBy, setGroupBy] = useState<GroupBy>(() => (searchParams.get('group') as GroupBy) || 'none');

  // Sync filter/sort/group → URL (preserving unrelated params, omitting empties).
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const setCsv = (key: string, set: Set<string>) => {
        if (set.size > 0) next.set(key, Array.from(set).join(',')); else next.delete(key);
      };
      setCsv('status', statusFilter);
      setCsv('priority', priorityFilter);
      setCsv('project', projectFilter);
      setCsv('assignee', assigneeFilter);
      setCsv('due', dueFilter);
      setCsv('tags', tagFilter);
      if (sortBy && sortBy !== 'manual') next.set('sort', sortBy); else next.delete('sort');
      if (sortBy !== 'manual' && sortDir === 'desc') next.set('dir', 'desc'); else next.delete('dir');
      if (groupBy && groupBy !== 'none') next.set('group', groupBy); else next.delete('group');
      return next;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, projectFilter, assigneeFilter, dueFilter, tagFilter, sortBy, sortDir, groupBy]);

  useEffect(() => {
    if (!canShowBoard && viewMode === 'board') setViewMode('list');
  }, [canShowBoard, viewMode]);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteTaskMutation = useDeleteTask();
  const bulkDeleteMutation = useBulkDeleteTasks();

  useEffect(() => { setSelectedIds(new Set()); }, [view]);
  // Clear selection whenever the visible set changes via filters/search/chips.
  useEffect(() => { setSelectedIds(new Set()); }, [
    searchQuery, visibilityFilter,
    statusFilter, priorityFilter, projectFilter, assigneeFilter, dueFilter, tagFilter,
  ]);

  const { data: counts } = useTaskCounts();
  const { data: projectsData } = useTaskProjectList();
  const { data: blockedTaskIds = [] } = useBlockedTaskIds();
  const projects = projectsData?.projects ?? [];

  // Map work view to API filter params
  const taskFilters = useMemo(() => {
    const base: Parameters<typeof useTaskList>[0] = { status: 'todo' };
    if (view === 'my') {
      return { ...base };
    }
    if (view === 'assigned' && currentUserId) {
      return { ...base, assigneeId: currentUserId };
    }
    if (view === 'created') {
      return { ...base };
    }
    if (view === 'all') {
      return {};
    }
    if (view.startsWith('project:')) {
      return { projectId: view.replace('project:', ''), status: 'todo' };
    }
    return base;
  }, [view, currentUserId]);

  const { data: tasksData, isLoading, isError, refetch } = useTaskList(taskFilters);
  const allTasks = tasksData?.tasks ?? [];

  const completedFilters = useMemo(() => {
    if (view === 'all') return null;
    if (view.startsWith('project:')) {
      return { projectId: view.replace('project:', ''), status: 'completed' };
    }
    return { status: 'completed' };
  }, [view]);

  const { data: completedData } = useTaskList(
    completedFilters ?? { status: 'completed' },
    { enabled: completedFilters !== null },
  );
  const completedTasks = completedFilters ? (completedData?.tasks ?? []) : [];

  // ── Distinct values present in loaded tasks (for filter option lists) ──
  const distinctStatuses = useMemo(() => {
    const s = new Set<string>();
    for (const task of allTasks) if (task.type !== 'heading') s.add(task.status);
    return Array.from(s).sort();
  }, [allTasks]);

  const distinctTags = useMemo(() => {
    const s = new Set<string>();
    for (const task of allTasks) for (const tag of task.tags ?? []) s.add(tag);
    return Array.from(s).sort();
  }, [allTasks]);

  const anyFilterActive =
    statusFilter.size > 0 || priorityFilter.size > 0 || projectFilter.size > 0 ||
    assigneeFilter.size > 0 || dueFilter.size > 0 || tagFilter.size > 0;

  const clearAllFilters = useCallback(() => {
    setStatusFilter(new Set());
    setPriorityFilter(new Set());
    setProjectFilter(new Set());
    setAssigneeFilter(new Set());
    setDueFilter(new Set());
    setTagFilter(new Set());
  }, []);

  // Predicate matching a task against a single due-bucket value.
  const matchesDue = useCallback((task: Task, bucket: string): boolean => {
    const todayStr = getTodayStr();
    const due = task.dueDate?.slice(0, 10) ?? null;
    switch (bucket as DueFilter) {
      case 'none': return !due;
      case 'overdue': return !!due && due < todayStr;
      case 'today': return due === todayStr;
      case 'week': {
        if (!due) return false;
        const now = new Date(todayStr + 'T00:00:00');
        const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
        const d = new Date(due + 'T00:00:00');
        return d >= now && d <= weekEnd;
      }
      default: return false;
    }
  }, []);

  const displayTasks = useMemo(() => {
    let tasks = allTasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(q));
    }
    // Mine = assigned to me, falling back to creator when unassigned
    // (so a task I made without assigning stays "mine"). Team = assigned
    // to someone else. The previous logic used t.userId (creator), which
    // missed every synced task — those are created by the sync user, not
    // by the viewer, so "Mine" was effectively empty. Headings are
    // exempt so project section headers keep rendering.
    if (visibilityFilter === 'mine') {
      tasks = tasks.filter(t =>
        t.type === 'heading' || (t.assigneeId ?? t.userId) === currentUserId,
      );
    } else if (visibilityFilter === 'team') {
      tasks = tasks.filter(t =>
        t.type === 'heading' || (!!t.assigneeId && t.assigneeId !== currentUserId),
      );
    }
    // Multi-select filters AND together; values within a filter OR together.
    // Headings are exempt so project heading groups keep rendering.
    if (anyFilterActive) {
      tasks = tasks.filter(task => {
        if (task.type === 'heading') return true;
        if (statusFilter.size > 0 && !statusFilter.has(task.status)) return false;
        if (priorityFilter.size > 0 && !priorityFilter.has(normalizePriority(task.priority))) return false;
        if (projectFilter.size > 0 && !(task.projectId && projectFilter.has(task.projectId))) return false;
        if (assigneeFilter.size > 0) {
          const key = task.assigneeId ?? UNASSIGNED;
          if (!assigneeFilter.has(key)) return false;
        }
        if (dueFilter.size > 0 && !Array.from(dueFilter).some(b => matchesDue(task, b))) return false;
        if (tagFilter.size > 0) {
          const tags = task.tags ?? [];
          const has = Array.from(tagFilter).some(tg => tg === NO_TAG ? tags.length === 0 : tags.includes(tg));
          if (!has) return false;
        }
        return true;
      });
    }
    return tasks;
  }, [allTasks, searchQuery, visibilityFilter, currentUserId, anyFilterActive,
      statusFilter, priorityFilter, projectFilter, assigneeFilter, dueFilter, tagFilter, matchesDue]);

  // Sort comparator for the flat (non-Manual) list.
  const sortComparator = useCallback((a: Task, b: Task): number => {
    let cmp = 0;
    switch (sortBy) {
      case 'priority':
        cmp = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
        break;
      case 'dueDate': {
        const av = a.dueDate ?? '￿'; const bv = b.dueDate ?? '￿';
        cmp = av.localeCompare(bv);
        break;
      }
      case 'title':
        cmp = (a.title || '').localeCompare(b.title || '');
        break;
      case 'created':
        cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
        break;
      default:
        cmp = 0;
    }
    return sortDir === 'desc' ? -cmp : cmp;
  }, [sortBy, sortDir]);

  const nonHeadingDisplayTasks = useMemo(() => {
    const list = displayTasks.filter(task => task.type !== 'heading');
    if (sortBy === 'manual') return list;
    return [...list].sort(sortComparator);
  }, [displayTasks, sortBy, sortComparator]);

  // Whether the special inbox grouping / project-heading grouping should be
  // bypassed (active filters, a non-manual sort, or an explicit group-by all
  // flatten the list into a single sorted/grouped surface).
  const flattenList = anyFilterActive || sortBy !== 'manual' || groupBy !== 'none';

  const projectTaskGroups = useMemo(() => {
    if (!view.startsWith('project:') || flattenList) return null;
    const headings = displayTasks.filter(t => t.type === 'heading');
    const regularTasks = displayTasks.filter(t => t.type !== 'heading');
    const ungrouped = regularTasks.filter(t => !t.headingId);
    const groups: { heading: Task | null; tasks: Task[] }[] = [];
    if (ungrouped.length > 0) groups.push({ heading: null, tasks: ungrouped });
    for (const h of headings) {
      groups.push({ heading: h, tasks: regularTasks.filter(t => t.headingId === h.id) });
    }
    return groups;
  }, [view, displayTasks, flattenList]);

  const inboxGroups = useMemo(() => {
    if (view !== 'my' || flattenList) return null;
    const tasks = nonHeadingDisplayTasks;
    const todayStr = getTodayStr();
    const overdue: Task[] = [], inbox: Task[] = [], today: Task[] = [];
    const evening: Task[] = [], anytime: Task[] = [], someday: Task[] = [];
    for (const task of tasks) {
      if (task.dueDate && task.dueDate.slice(0, 10) < todayStr) overdue.push(task);
      else if (task.when === 'today') today.push(task);
      else if (task.when === 'evening') evening.push(task);
      else if (task.when === 'anytime') anytime.push(task);
      else if (task.when === 'someday') someday.push(task);
      else inbox.push(task);
    }
    const groups: { label: string; icon: typeof Inbox; color: string; tasks: Task[]; noHeader?: boolean }[] = [];
    overdue.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    if (overdue.length > 0) groups.push({ label: t('tasks.overdue'), icon: Calendar, color: '#ef4444', tasks: overdue });
    if (inbox.length > 0) groups.push({ label: t('tasks.unscheduled'), icon: Inbox, color: '#3b82f6', tasks: inbox, noHeader: true });
    if (today.length > 0) groups.push({ label: t('tasks.todayLabel'), icon: Star, color: '#f59e0b', tasks: today });
    if (evening.length > 0) groups.push({ label: t('tasks.thisEvening'), icon: Moon, color: '#6366f1', tasks: evening });
    if (anytime.length > 0) groups.push({ label: t('tasks.whenOptions.anytime'), icon: CircleDot, color: '#06b6d4', tasks: anytime });
    if (someday.length > 0) groups.push({ label: t('tasks.whenOptions.someday'), icon: Coffee, color: '#a78bfa', tasks: someday });
    return groups;
  }, [view, nonHeadingDisplayTasks, flattenList, t]);

  // Group-by groups (rendered through the inboxGroups path in TaskListView).
  const groupByGroups = useMemo(() => {
    if (groupBy === 'none') return null;
    const memberName = (id: string | null) => {
      if (!id) return t('tasks.unassigned');
      const m = tenantMembers?.find(u => u.userId === id);
      return m?.name || m?.email || id;
    };
    const projectName = (id: string | null) => {
      if (!id) return t('tasks.noProject');
      return projects.find(p => p.id === id)?.title || id;
    };
    const buckets = new Map<string, { label: string; color: string; tasks: Task[]; order: number }>();
    const push = (key: string, label: string, color: string, order: number, task: Task) => {
      if (!buckets.has(key)) buckets.set(key, { label, color, tasks: [], order });
      buckets.get(key)!.tasks.push(task);
    };
    const todayStr = getTodayStr();
    for (const task of nonHeadingDisplayTasks) {
      switch (groupBy) {
        case 'status':
          push(`s:${task.status}`, t(`tasks.status.${task.status}`, task.status), '#6b7280', 0, task);
          break;
        case 'priority': {
          // urgent collapses into the High bucket for display.
          const np = normalizePriority(task.priority);
          const order = 4 - (PRIORITY_RANK[np] ?? 0);
          const opt = PRIORITY_OPTIONS.find(o => o.value === np);
          push(`p:${np}`, t(opt?.labelKey ?? 'tasks.priority.none'), opt?.color ?? '#6b7280', order, task);
          break;
        }
        case 'project':
          push(`pr:${task.projectId ?? 'none'}`, projectName(task.projectId), '#8b5cf6', task.projectId ? 0 : 1, task);
          break;
        case 'assignee':
          push(`a:${task.assigneeId ?? 'none'}`, memberName(task.assigneeId), '#10b981', task.assigneeId ? 0 : 1, task);
          break;
        case 'due': {
          const due = task.dueDate?.slice(0, 10) ?? null;
          if (!due) push('d:none', t('tasks.noDueDate'), '#6b7280', 4, task);
          else if (due < todayStr) push('d:overdue', t('tasks.overdue'), '#ef4444', 0, task);
          else if (due === todayStr) push('d:today', t('tasks.todayLabel'), '#f59e0b', 1, task);
          else push('d:later', t('tasks.upcoming'), '#3b82f6', 2, task);
          break;
        }
      }
    }
    const arr = Array.from(buckets.values()).sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
    return arr.map(g => ({ label: g.label, icon: GroupIcon, color: g.color, tasks: g.tasks }));
  }, [groupBy, nonHeadingDisplayTasks, tenantMembers, projects, t]);

  // The groups actually handed to TaskListView's "inboxGroups" slot.
  const effectiveInboxGroups = groupBy !== 'none' ? groupByGroups : inboxGroups;

  const showWhenBadges = useMemo(() => {
    return view.startsWith('project:') || view === 'all' || view === 'assigned' || view === 'created';
  }, [view]);

  const showProjectInList = tasksSettings.showProjectInList;

  const showDueDateInList = view !== 'my';

  const selectedTask = useMemo(
    () => displayTasks.find(t => t.id === selectedTaskId) ?? null,
    [displayTasks, selectedTaskId],
  );
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const queryClient = useQueryClient();

  const defaultWhen: TaskWhen = 'inbox';
  const projectIdForNew = view.startsWith('project:') ? view.replace('project:', '') : null;
  const activeProject = projectIdForNew ? projects.find(p => p.id === projectIdForNew) ?? null : null;

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (showSearch) { setShowSearch(false); setSearchQuery(''); }
        else if (selectedTaskId) setSelectedTaskId(null);
      }
      if (e.key === '/' && !isInputFocused()) {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, showSearch]);

  const toggleSelectOne = useCallback((taskId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const visibleTasks = displayTasks.filter(t => t.type !== 'heading');
    const allSelected = visibleTasks.length > 0 && visibleTasks.every(t => selectedIds.has(t.id));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleTasks.map(t => t.id)));
  }, [displayTasks, selectedIds]);

  const handleBulkDelete = useCallback(async () => {
    await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setShowDeleteConfirm(false);
    setSelectedTaskId(null);
  }, [selectedIds, bulkDeleteMutation]);

  // Apply a partial update to every selected task (bounded concurrency).
  const applyBulk = useCallback(async (patch: Record<string, unknown>) => {
    const ids = Array.from(selectedIds);
    const CONCURRENCY = 5;
    for (let i = 0; i < ids.length; i += CONCURRENCY) {
      const slice = ids.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(id => updateTask.mutateAsync({ id, ...patch })));
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.work.all });
    setSelectedIds(new Set());
  }, [selectedIds, updateTask, queryClient]);

  const handleComplete = useCallback((taskId: string) => {
    const task = allTasks.find(t => t.id === taskId) ?? completedTasks.find(t => t.id === taskId);
    updateTask.mutate({ id: taskId, status: task && isDoneStatus(task.status) ? 'todo' : 'completed' });
  }, [updateTask, allTasks, completedTasks]);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    const taskEl = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement | null;
    if (taskEl) {
      const ghost = taskEl.cloneNode(true) as HTMLElement;
      ghost.style.cssText = 'position:absolute;top:-9999px;left:-9999px;border-radius:var(--radius-lg);box-shadow:0 4px 16px rgba(0,0,0,0.15);opacity:0.92;padding:10px 16px;background:var(--color-bg-elevated)';
      ghost.style.width = `${taskEl.offsetWidth}px`;
      document.body.appendChild(ghost);
      const rect = taskEl.getBoundingClientRect();
      e.dataTransfer.setDragImage(ghost, e.clientX - rect.left, e.clientY - rect.top);
      requestAnimationFrame(() => document.body.removeChild(ghost));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (targetId !== dropTargetId) setDropTargetId(targetId);
  }, [dropTargetId]);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetId) { setDraggedTaskId(null); setDropTargetId(null); return; }
    const currentOrder = displayTasks.filter(t => t.type !== 'heading').map(t => t.id);
    const sourceIdx = currentOrder.indexOf(draggedTaskId);
    const targetIdx = currentOrder.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;
    currentOrder.splice(sourceIdx, 1);
    currentOrder.splice(targetIdx, 0, draggedTaskId);
    reorderTasks.mutate(currentOrder);
    setDraggedTaskId(null);
    setDropTargetId(null);
  }, [draggedTaskId, displayTasks, reorderTasks]);

  const handleDragEnd = useCallback(() => { setDraggedTaskId(null); setDropTargetId(null); }, []);

  const handleDeleteHeading = useCallback((headingId: string) => {
    for (const child of allTasks.filter(t => t.headingId === headingId)) {
      updateTask.mutate({ id: child.id, headingId: null });
    }
    updateTask.mutate({ id: headingId, isArchived: true });
  }, [allTasks, updateTask]);

  const visibleNonHeadingTasks = useMemo(() => displayTasks.filter(t => t.type !== 'heading'), [displayTasks]);
  const allVisibleSelected = visibleNonHeadingTasks.length > 0 && visibleNonHeadingTasks.every(t => selectedIds.has(t.id));
  const someVisibleSelected = selectedIds.size > 0 && !allVisibleSelected;
  const blockedTaskIdSet = useMemo(() => new Set(blockedTaskIds), [blockedTaskIds]);

  // Drag reorder is only meaningful for the manual, unfiltered list.
  const dragEnabled = !flattenList;

  const renderTaskItem = useCallback((task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      isSelected={selectedTaskId === task.id}
      onClick={() => setSelectedTaskId(task.id)}
      onComplete={() => handleComplete(task.id)}
      onTitleSave={(newTitle) => updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, title: newTitle })}
      projects={projects}
      members={tenantMembers}
      showWhenBadge={showWhenBadges}
      showProject={showProjectInList}
      showDueDate={showDueDateInList}
      onDragStart={dragEnabled ? handleDragStart : undefined}
      onDragOver={dragEnabled ? handleDragOver : undefined}
      onDrop={dragEnabled ? handleDrop : undefined}
      onDragEnd={dragEnabled ? handleDragEnd : undefined}
      isDragging={draggedTaskId === task.id}
      isDropTarget={dropTargetId === task.id && draggedTaskId !== task.id}
      showCheckbox={selectedIds.size > 0}
      isChecked={selectedIds.has(task.id)}
      onCheckToggle={toggleSelectOne}
      isBlocked={blockedTaskIdSet.has(task.id)}
    />
  ), [selectedTaskId, handleComplete, updateTask, projects, tenantMembers, showWhenBadges, showProjectInList, showDueDateInList, dragEnabled, handleDragStart, handleDragOver, handleDrop, handleDragEnd, draggedTaskId, dropTargetId, selectedIds, toggleSelectOne, blockedTaskIdSet]);

  // Derive nav-section equivalent for TaskListView
  const activeSection = view === 'my' ? 'inbox' as const
    : view.startsWith('project:') ? view as `project:${string}`
    : 'inbox' as const;

  const _ = counts; // suppress unused warning — counts used for future badge display
  void deleteTaskMutation;

  // ── Filter option lists ──
  const statusOptions: FilterOption[] = distinctStatuses.map(s => ({ value: s, label: t(`tasks.status.${s}`, s) }));
  const priorityOptions: FilterOption[] = PRIORITY_OPTIONS.map(o => ({ value: o.value, label: t(o.labelKey), color: o.color === 'transparent' ? undefined : o.color }));
  const projectOptions: FilterOption[] = projects.map(p => ({ value: p.id, label: p.title, color: p.color }));
  const assigneeOptions: FilterOption[] = [
    { value: UNASSIGNED, label: t('tasks.unassigned') },
    ...(tenantMembers ?? []).map(u => ({ value: u.userId, label: u.name || u.email })),
  ];
  const dueOptions: FilterOption[] = [
    { value: 'overdue', label: t('tasks.overdue'), color: '#ef4444' },
    { value: 'today', label: t('tasks.dueToday'), color: '#f59e0b' },
    { value: 'week', label: t('tasks.dueThisWeek'), color: '#3b82f6' },
    { value: 'none', label: t('tasks.noDueDate') },
  ];
  const tagOptions: FilterOption[] = [
    { value: NO_TAG, label: t('tasks.noTags') },
    ...distinctTags.map(tg => ({ value: tg, label: tg })),
  ];

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'manual', label: t('tasks.sortManual') },
    { value: 'priority', label: t('tasks.sortPriority') },
    { value: 'dueDate', label: t('tasks.sortDueDate') },
    { value: 'title', label: t('tasks.sortTitle') },
    { value: 'created', label: t('tasks.sortCreated') },
  ];
  const groupOptions: { value: GroupBy; label: string }[] = [
    { value: 'none', label: t('tasks.groupNone') },
    { value: 'status', label: t('tasks.groupStatus') },
    { value: 'priority', label: t('tasks.groupPriority') },
    { value: 'project', label: t('tasks.groupProject') },
    { value: 'assignee', label: t('tasks.groupAssignee') },
    { value: 'due', label: t('tasks.groupDue') },
  ];

  // ── Active-filter chips (removable) ──
  const filterChips: { key: string; label: string; onRemove: () => void }[] = [];
  const addChips = (set: Set<string>, opts: FilterOption[], prefix: string, remove: (v: string) => void) => {
    for (const v of set) {
      const label = opts.find(o => o.value === v)?.label ?? v;
      filterChips.push({ key: `${prefix}:${v}`, label, onRemove: () => remove(v) });
    }
  };
  const removeFrom = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (v: string) =>
    setter(prev => { const n = new Set(prev); n.delete(v); return n; });
  addChips(statusFilter, statusOptions, 's', removeFrom(setStatusFilter));
  addChips(priorityFilter, priorityOptions, 'p', removeFrom(setPriorityFilter));
  addChips(projectFilter, projectOptions, 'pr', removeFrom(setProjectFilter));
  addChips(assigneeFilter, assigneeOptions, 'a', removeFrom(setAssigneeFilter));
  addChips(dueFilter, dueOptions, 'd', removeFrom(setDueFilter));
  addChips(tagFilter, tagOptions, 'tg', removeFrom(setTagFilter));

  // ── Quick-filter chips ──
  const setExclusive = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) =>
    setter(prev => prev.size === 1 && prev.has(value) ? new Set() : new Set([value]));
  const quickChips: { key: string; label: string; active: boolean; toggle: () => void }[] = [
    { key: 'overdue', label: t('tasks.quickOverdue'), active: dueFilter.size === 1 && dueFilter.has('overdue'),
      toggle: () => setExclusive(setDueFilter, 'overdue') },
    { key: 'today', label: t('tasks.quickDueToday'), active: dueFilter.size === 1 && dueFilter.has('today'),
      toggle: () => setExclusive(setDueFilter, 'today') },
    { key: 'high', label: t('tasks.quickHighPriority'), active: priorityFilter.size === 1 && priorityFilter.has('high'),
      toggle: () => setExclusive(setPriorityFilter, 'high') },
    { key: 'unassigned', label: t('tasks.quickUnassigned'), active: assigneeFilter.size === 1 && assigneeFilter.has(UNASSIGNED),
      toggle: () => setExclusive(setAssigneeFilter, UNASSIGNED) },
    { key: 'nodate', label: t('tasks.quickNoDueDate'), active: dueFilter.size === 1 && dueFilter.has('none'),
      toggle: () => setExclusive(setDueFilter, 'none') },
  ];

  if (isError) {
    return (
      <div className="tasks-page">
        <ContentArea title={title}>
          <QueryErrorState onRetry={() => refetch()} />
        </ContentArea>
      </div>
    );
  }

  const showToolbar = viewMode !== 'calendar';

  return (
    <div className="tasks-page">
      <ContentArea
        title={title}
        actions={
          <>
            {displayTasks.length > 0 && <span className="tasks-toolbar-count">{displayTasks.length}</span>}
            <div className="tasks-view-toggle">
              {(['all', 'mine', 'team'] as const).map((f) => (
                <button key={f} className={`tasks-view-toggle-btn${visibilityFilter === f ? ' active' : ''}`}
                  onClick={() => setVisibilityFilter(f)}
                  title={f === 'all' ? t('tasks.filterAll') : f === 'mine' ? t('tasks.filterMine') : t('tasks.filterTeam')}
                >
                  {f === 'all' ? <Eye size={14} /> : f === 'mine' ? <User size={14} /> : <Users size={14} />}
                </button>
              ))}
            </div>
            {visibleNonHeadingTasks.length > 0 && (
              <IconButton
                icon={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14 }}>
                  <input type="checkbox" checked={allVisibleSelected}
                    ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
                    onChange={() => {}} style={{ cursor: 'pointer', accentColor: 'var(--color-accent-primary)', margin: 0 }} />
                </span>}
                label={allVisibleSelected ? t('tasks.deselectAll') : t('tasks.selectAll')} size={28} onClick={toggleSelectAll}
              />
            )}
            <div className="tasks-view-toggle">
              <button className={`tasks-view-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
                onClick={() => { setViewMode('list'); tasksSettings.setViewMode('list'); }} title={t('tasks.listView')}>
                <LayoutList size={14} />
              </button>
              {canShowBoard && (
                <button className={`tasks-view-toggle-btn${viewMode === 'board' ? ' active' : ''}`}
                  onClick={() => { setViewMode('board'); tasksSettings.setViewMode('board'); }} title={t('tasks.boardView')}>
                  <LayoutGrid size={14} />
                </button>
              )}
              <button className={`tasks-view-toggle-btn${viewMode === 'table' ? ' active' : ''}`}
                onClick={() => { setViewMode('table'); tasksSettings.setViewMode('table'); }} title={t('tasks.tableView')}>
                <Table2 size={14} />
              </button>
              <button className={`tasks-view-toggle-btn${viewMode === 'calendar' ? ' active' : ''}`}
                onClick={() => setViewMode('calendar')} title={t('tasks.calendarView', 'Calendar')}>
                <Calendar size={14} />
              </button>
            </div>
            {showSearch ? (
              <div className="tasks-search-bar">
                <Search size={13} color="var(--color-text-tertiary)" />
                <input ref={searchInputRef} className="tasks-search-input" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }}
                  placeholder={t('tasks.searchPlaceholder')} />
                <IconButton icon={<X size={12} />} label={t('tasks.closeSearch')} size={24} tooltip={false}
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }} />
              </div>
            ) : (
              <IconButton icon={<Search size={15} />} label={t('tasks.searchShortcut')} size={28}
                onClick={() => { setShowSearch(true); setTimeout(() => searchInputRef.current?.focus(), 50); }} />
            )}
          </>
        }
      >
        {/* Filter / sort / group toolbar */}
        {showToolbar && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            padding: '8px var(--spacing-lg)', borderBottom: '1px solid var(--color-border-secondary)',
            flexShrink: 0,
          }}>
            {/* Row 1: filter dropdowns + sort + group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <SlidersHorizontal size={13} color="var(--color-text-tertiary)" />
              <MultiSelectFilter icon={<CircleDot size={12} />} label={t('tasks.filterStatus')} options={statusOptions} selected={statusFilter} onChange={setStatusFilter} />
              <MultiSelectFilter icon={<Flag size={12} />} label={t('tasks.filterPriority')} options={priorityOptions} selected={priorityFilter} onChange={setPriorityFilter} />
              <MultiSelectFilter icon={<FolderKanban size={12} />} label={t('tasks.filterProject')} options={projectOptions} selected={projectFilter} onChange={setProjectFilter} />
              <MultiSelectFilter icon={<User size={12} />} label={t('tasks.filterAssignee')} options={assigneeOptions} selected={assigneeFilter} onChange={setAssigneeFilter} />
              <MultiSelectFilter icon={<Calendar size={12} />} label={t('tasks.filterDue')} options={dueOptions} selected={dueFilter} onChange={setDueFilter} />
              <MultiSelectFilter icon={<TagIcon size={12} />} label={t('tasks.filterTags')} options={tagOptions} selected={tagFilter} onChange={setTagFilter} />

              <span style={{ flex: 1 }} />

              {/* Sort */}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" style={triggerStyle(sortBy !== 'manual')}>
                    <ArrowUpDown size={12} />
                    {sortOptions.find(o => o.value === sortBy)?.label}
                    <ChevronDown size={11} />
                  </button>
                </PopoverTrigger>
                <PopoverContent minWidth={150} style={{ padding: 4 }}>
                  {sortOptions.map(o => (
                    <button key={o.value} type="button" onClick={() => setSortBy(o.value)} style={menuItemStyle(o.value === sortBy)}>
                      <span style={{ width: 14 }}>{o.value === sortBy && <Check size={13} color="var(--color-accent-primary)" />}</span>
                      {o.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              {sortBy !== 'manual' && (
                <IconButton
                  icon={sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  label={sortDir === 'asc' ? t('tasks.sortAsc') : t('tasks.sortDesc')}
                  size={28}
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                />
              )}

              {/* Group by */}
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" style={triggerStyle(groupBy !== 'none')}>
                    <GroupIcon size={12} />
                    {groupOptions.find(o => o.value === groupBy)?.label}
                    <ChevronDown size={11} />
                  </button>
                </PopoverTrigger>
                <PopoverContent minWidth={150} style={{ padding: 4 }}>
                  {groupOptions.map(o => (
                    <button key={o.value} type="button" onClick={() => setGroupBy(o.value)} style={menuItemStyle(o.value === groupBy)}>
                      <span style={{ width: 14 }}>{o.value === groupBy && <Check size={13} color="var(--color-accent-primary)" />}</span>
                      {o.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            {/* Row 2: quick chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {quickChips.map(chip => (
                <button key={chip.key} type="button" onClick={chip.toggle} style={quickChipStyle(chip.active)}>
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Row 3: active filter chips */}
            {filterChips.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {filterChips.map(chip => (
                  <span key={chip.key} style={activeChipStyle}>
                    {chip.label}
                    <button type="button" onClick={chip.onRemove} style={chipCloseStyle} aria-label={t('common.cancel')}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <button type="button" onClick={clearAllFilters} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)', color: 'var(--color-accent-primary)', fontFamily: 'var(--font-family)',
                }}>
                  {t('tasks.clearAllFilters')}
                </button>
              </div>
            )}
          </div>
        )}

        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: '6px var(--spacing-lg)',
            background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-secondary)', flexShrink: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family)' }}>
              {t('tasks.selected', { count: selectedIds.size })}
            </span>

            {/* Set status */}
            <BulkMenu label={t('tasks.bulkSetStatus')} options={statusOptions.length ? statusOptions : [
              { value: 'todo', label: t('tasks.status.todo', 'todo') },
              { value: 'completed', label: t('tasks.status.completed', 'completed') },
            ]} onPick={(v) => applyBulk({ status: v as TaskStatus })} />

            {/* Set priority */}
            <BulkMenu label={t('tasks.bulkSetPriority')} options={priorityOptions} onPick={(v) => applyBulk({ priority: v as TaskPriority })} />

            {/* Assign to */}
            <BulkMenu label={t('tasks.bulkAssign')} options={assigneeOptions} onPick={(v) => applyBulk({ assigneeId: v === UNASSIGNED ? null : v })} />

            {/* Move to project */}
            <BulkMenu label={t('tasks.bulkMoveProject')} options={[{ value: UNASSIGNED, label: t('tasks.noProject') }, ...projectOptions]} onPick={(v) => applyBulk({ projectId: v === UNASSIGNED ? null : v })} />

            {/* Set due date */}
            <BulkDueDate label={t('tasks.bulkSetDueDate')} onPick={(v) => applyBulk({ dueDate: v })} />

            {canDelete && <Button variant="danger" size="sm" icon={<Trash2 size={13} />}
              onClick={() => setShowDeleteConfirm(true)}>{t('tasks.bulkDelete')}</Button>}
            <Button variant="ghost" size="sm" icon={<X size={13} />}
              onClick={() => setSelectedIds(new Set())}>{t('common.cancel')}</Button>
          </div>
        )}

        <div className="tasks-content">
          {viewMode === 'calendar' ? (
            <CalendarView tasks={nonHeadingDisplayTasks} onSelectTask={setSelectedTaskId} />
          ) : viewMode === 'table' ? (
            <TaskTableView
              tasks={nonHeadingDisplayTasks}
              projects={projects}
              members={tenantMembers}
              selectedTaskId={selectedTaskId}
              selectedIds={selectedIds}
              onSelectTask={setSelectedTaskId}
              onComplete={handleComplete}
              onCheckToggle={toggleSelectOne}
            />
          ) : viewMode === 'board' && canShowBoard ? (
            <KanbanBoard tasks={displayTasks} projects={projects} onComplete={handleComplete} onSelectTask={(id) => setSelectedTaskId(id)} />
          ) : (
            <TaskListView
              activeSection={activeSection}
              displayTasks={flattenList ? nonHeadingDisplayTasks : displayTasks}
              completedTasks={completedTasks}
              todayTasks={null}
              projectTaskGroups={projectTaskGroups}
              inboxGroups={effectiveInboxGroups}
              activeProject={activeProject}
              projects={projects}
              tenantMembers={tenantMembers}
              defaultWhen={defaultWhen}
              projectIdForNew={projectIdForNew}
              isLoading={isLoading}
              seeding={false}
              canCreate={canCreate && !flattenList}
              selectedTaskId={selectedTaskId}
              showWhenBadges={showWhenBadges}
              showProjectInList={showProjectInList}
              showDueDateInList={showDueDateInList}
              draggedTaskId={draggedTaskId}
              dropTargetId={dropTargetId}
              selectedIds={selectedIds}
              blockedTaskIdSet={blockedTaskIdSet}
              onSelectTask={setSelectedTaskId}
              onComplete={handleComplete}
              onTitleSave={(id, newTitle) => updateTask.mutate({ id, title: newTitle })}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onToggleSelectOne={toggleSelectOne}
              onDeleteHeading={handleDeleteHeading}
              onSeed={() => {}}
              renderTaskItem={renderTaskItem}
            />
          )}
          {selectedTask && selectedTask.type !== 'heading' && (
            <TaskDetailPanel task={selectedTask} projects={projects} members={tenantMembers} allTasks={allTasks} onClose={() => setSelectedTaskId(null)} />
          )}
        </div>
      </ContentArea>

      <ConfirmDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}
        title={t('tasks.bulkDelete')} description={t('tasks.bulkDeleteConfirm', { count: selectedIds.size })}
        confirmLabel={t('common.delete')} onConfirm={handleBulkDelete} destructive />
    </div>
  );
}

// ─── Toolbar style helpers ────────────────────────────────────────────

function triggerStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '4px 8px', borderRadius: 'var(--radius-md)',
    border: `1px solid ${active ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)'}`,
    background: active ? 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)' : 'transparent',
    color: active ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family)', cursor: 'pointer', whiteSpace: 'nowrap',
  };
}

function menuItemStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '6px 8px', border: 'none', background: 'transparent',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
    fontSize: 'var(--font-size-sm)', color: active ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
    fontFamily: 'var(--font-family)',
  };
}

function quickChipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '3px 10px', borderRadius: 999,
    border: `1px solid ${active ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)'}`,
    background: active ? 'var(--color-accent-primary)' : 'transparent',
    color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family)', cursor: 'pointer', whiteSpace: 'nowrap',
  };
}

const activeChipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 4px 2px 8px', borderRadius: 999,
  background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)',
  fontSize: 'var(--font-size-xs)', fontFamily: 'var(--font-family)',
};

const chipCloseStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 16, height: 16, border: 'none', borderRadius: '50%',
  background: 'transparent', cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 0,
};

// ─── Bulk action menus ────────────────────────────────────────────────

function BulkMenu({ label, options, onPick }: { label: string; options: FilterOption[]; onPick: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" icon={<ChevronDown size={12} />}>{label}</Button>
      </PopoverTrigger>
      <PopoverContent minWidth={170} style={{ padding: 4, maxHeight: 300, overflowY: 'auto' }}>
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => { onPick(o.value); setOpen(false); }} style={menuItemStyle(false)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {o.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: o.color, flexShrink: 0 }} />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function BulkDueDate({ label, onPick }: { label: string; onPick: (value: string | null) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm" icon={<Calendar size={12} />}>{label}</Button>
      </PopoverTrigger>
      <PopoverContent minWidth={180} style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          type="date"
          className="task-date-input"
          onChange={(e) => { if (e.target.value) { onPick(e.target.value); setOpen(false); } }}
        />
        <button type="button" onClick={() => { onPick(null); setOpen(false); }} style={menuItemStyle(false)}>
          <X size={12} /> {t('tasks.clearDueDate')}
        </button>
      </PopoverContent>
    </Popover>
  );
}
