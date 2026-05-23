import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate as formatDateGlobal } from '../../../lib/format';
import type { Task, TaskProject, RecurrenceRule, TenantUser, UpdateTaskInput } from '@atlas-platform/shared';
import { useUpdateTask, useDeleteTask, useUpdateTaskVisibility } from '../hooks';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { useAuthStore } from '../../../stores/auth-store';
import { WHEN_OPTIONS, PRIORITY_OPTIONS, RECURRENCE_OPTIONS, normalizePriority } from '../lib/constants';
import { TaskNotesEditor } from './task-notes-editor';
import { SubtaskSection } from './subtask-section';
import { DependencySection } from './dependency-section';
import { AttachmentSection } from './attachment-section';
import { TaskTimeSection } from './task-time-section';
import { CommentSection } from './comment-section';
import { ActivitySection } from './activity-section';
import { EmojiPicker } from '../../../components/shared/emoji-picker';
import { SmartButtonBar } from '../../../components/shared/SmartButtonBar';
import { PresenceAvatars } from '../../../components/shared/presence-avatars';
import { VisibilityToggle } from '../../../components/shared/visibility-toggle';
import { Avatar } from '../../../components/ui/avatar';
import { IconButton } from '../../../components/ui/icon-button';
import { Select } from '../../../components/ui/select';
import { StatusDot } from '../../../components/ui/status-dot';

// Convert a stored ISO datetime → the value a <input type="datetime-local">
// expects (local time, no timezone, minute precision). Empty on null.
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Convert a datetime-local input value (local time) → ISO string, or null
// when cleared.
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// The single "Due" field is a date + optional time. Its input value comes
// from the full endAt datetime when present, otherwise the date-only dueDate
// (rendered with a blank time). `dueDate` stays the source of truth for
// overdue/filters/month-calendar/sort + the date-only task sync.
function dueInputValue(dueDate: string | null | undefined, endAt: string | null | undefined): string {
  if (endAt) return isoToLocalInput(endAt);
  if (dueDate) return `${dueDate.slice(0, 10)}T`; // date with empty time
  return '';
}

// Whether a datetime-local value carries a time component (has "THH:MM").
function hasTime(value: string): boolean {
  const time = value.split('T')[1];
  return !!time && /\d{2}:\d{2}/.test(time);
}

export function TaskDetailPanel({
  task,
  projects,
  members,
  allTasks,
  onClose,
}: {
  task: Task;
  projects: TaskProject[];
  members?: TenantUser[];
  allTasks: Task[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { canCreate, canEdit, canDelete: canDeleteAll, canDeleteOwn } = useAppActions('work');
  const [title, setTitle] = useState(task.title);
  const [when, setWhen] = useState(task.when);
  const [priority, setPriority] = useState(task.priority);
  // Single "Due" field = date + optional time. Backed by dueDate (date part)
  // + endAt (full datetime / block end).
  const [dueDateTime, setDueDateTime] = useState(dueInputValue(task.dueDate, task.endAt));
  const [startAt, setStartAt] = useState(isoToLocalInput(task.startAt));
  const [showTaskEmoji, setShowTaskEmoji] = useState(false);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const updateVisibility = useUpdateTaskVisibility();
  const { account } = useAuthStore();
  const isOwner = task.userId === account?.userId;
  const canDelete = canDeleteAll || (canDeleteOwn && isOwner);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setTitle(task.title);
    setWhen(task.when);
    setPriority(task.priority);
    setDueDateTime(dueInputValue(task.dueDate, task.endAt));
    setStartAt(isoToLocalInput(task.startAt));
  }, [task.id, task.title, task.when, task.priority, task.dueDate, task.startAt, task.endAt]);

  const autoSave = useCallback((updates: Partial<UpdateTaskInput>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, ...updates } as Parameters<typeof updateTask.mutate>[0]);
    }, 500);
  }, [task.id, updateTask]);

  const handleDelete = () => {
    deleteTask.mutate(task.id);
    onClose();
  };

  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;

  return (
    <div className="task-detail-panel">
      {/* Header */}
      <div className="task-detail-header">
        <span className="task-detail-header-label">{t('tasks.taskDetail')}</span>
        <div className="task-detail-header-actions">
          <PresenceAvatars appId="work" recordId={task.id} />
          {canDelete && (
            <IconButton
              icon={<Trash2 size={14} />}
              label={t('tasks.deleteTask')}
              size={28}
              destructive
              onClick={handleDelete}
            />
          )}
          <IconButton
            icon={<X size={14} />}
            label={t('common.close')}
            size={28}
            onClick={onClose}
          />
        </div>
      </div>

      <SmartButtonBar appId="work" recordId={task.id} />

      {/* Body */}
      <div className="task-detail-body task-list-scroll">
        {/* Task emoji + title row */}
        <div className="task-detail-title-row">
          <div style={{ position: 'relative' }}>
            <button
              className="task-detail-emoji-btn"
              onClick={() => canEdit && setShowTaskEmoji(!showTaskEmoji)}
              disabled={!canEdit}
              title={t('tasks.setIcon')}
            >
              {task.icon || <Plus size={14} />}
            </button>
            {showTaskEmoji && (
              <EmojiPicker
                onSelect={(emoji) => { updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, icon: emoji }); setShowTaskEmoji(false); }}
                onRemove={() => { updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, icon: null }); setShowTaskEmoji(false); }}
                onClose={() => setShowTaskEmoji(false)}
              />
            )}
          </div>
          <input
            ref={titleRef}
            className="task-detail-title"
            value={title}
            readOnly={!canEdit}
            onChange={e => {
              if (!canEdit) return;
              setTitle(e.target.value);
              autoSave({ title: e.target.value });
            }}
            placeholder={t('tasks.taskTitlePlaceholder')}
          />
        </div>

        {/* Timestamps */}
        <div className="task-detail-timestamps">
          <div className="task-detail-timestamp-text">
            {t('tasks.createdOn', { date: formatDateGlobal(task.createdAt) })}
            {task.completedAt && (
              <> · {t('tasks.completedOn', { date: formatDateGlobal(task.completedAt) })}</>
            )}
          </div>
        </div>

        {/* Metadata fields */}
        <div className="task-detail-fields">
          {/* When */}
          <div className="task-detail-field">
            <span className="task-detail-label">{t('tasks.whenLabel')}</span>
            <div className="task-detail-pills">
              {WHEN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`task-pill${when === opt.value ? ' active' : ''}`}
                  disabled={!canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    setWhen(opt.value);
                    updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, when: opt.value });
                  }}
                >
                  <opt.icon size={11} />
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="task-detail-field">
            <span className="task-detail-label">{t('tasks.priorityLabel')}</span>
            <div className="task-detail-pills">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`task-pill${normalizePriority(priority) === opt.value ? ' active' : ''}`}
                  disabled={!canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    setPriority(opt.value);
                    updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, priority: opt.value });
                  }}
                >
                  {opt.color !== 'transparent' && (
                    <StatusDot color={opt.color} size={6} />
                  )}
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Start time */}
          <div className="task-detail-field">
            <span className="task-detail-label">{t('tasks.startTime')}</span>
            <input
              type="datetime-local"
              className="task-date-input"
              value={startAt}
              disabled={!canEdit}
              onChange={e => {
                if (!canEdit) return;
                setStartAt(e.target.value);
                updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, startAt: localInputToIso(e.target.value) });
              }}
            />
            {startAt && (
              <IconButton
                icon={<X size={12} />}
                label={t('tasks.clearStartTime')}
                size={24}
                onClick={() => {
                  setStartAt('');
                  updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, startAt: null });
                }}
              />
            )}
          </div>

          {/* Due date (single field: date + optional time) */}
          <div className="task-detail-field">
            <span className="task-detail-label">{t('tasks.dueLabel')}</span>
            <input
              type="datetime-local"
              className="task-date-input"
              value={dueDateTime}
              disabled={!canEdit}
              onChange={e => {
                if (!canEdit) return;
                const v = e.target.value;
                setDueDateTime(v);
                if (!v) {
                  // Cleared entirely → drop both.
                  updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, dueDate: null, endAt: null });
                  return;
                }
                const datePart = v.slice(0, 10);
                // dueDate stays date-only; endAt holds the full time when set.
                updateTask.mutate({
                  id: task.id,
                  updatedAt: task.updatedAt,
                  dueDate: datePart,
                  endAt: hasTime(v) ? localInputToIso(v) : null,
                });
              }}
            />
            {dueDateTime && (
              <IconButton
                icon={<X size={12} />}
                label={t('tasks.clearDueDate')}
                size={24}
                onClick={() => {
                  setDueDateTime('');
                  updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, dueDate: null, endAt: null });
                }}
              />
            )}
          </div>

          {/* Recurrence */}
          <div className="task-detail-field">
            <span className="task-detail-label">{t('tasks.repeat')}</span>
            <Select
              value={task.recurrenceRule || ''}
              disabled={!canEdit}
              onChange={(v) => {
                if (!canEdit) return;
                const val = v || null;
                updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, recurrenceRule: val as RecurrenceRule | null });
              }}
              options={RECURRENCE_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }))}
              size="sm"
            />
          </div>

          {/* Project */}
          {project && (
            <div className="task-detail-field">
              <span className="task-detail-label">{t('tasks.projectLabel')}</span>
              <span className="task-detail-project-info">
                {project.icon ? (
                  <span style={{ fontSize: 'var(--font-size-md)' }}>{project.icon}</span>
                ) : (
                  <div className="task-detail-project-dot" style={{ background: project.color }} />
                )}
                {project.title}
              </span>
            </div>
          )}

          {/* Assignee */}
          {members && members.length > 0 && (
            <div className="task-detail-field">
              <span className="task-detail-label">{t('tasks.assignee')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Select
                  value={task.assigneeId || ''}
                  disabled={!canEdit}
                  onChange={(v) => {
                    if (!canEdit) return;
                    updateTask.mutate({ id: task.id, updatedAt: task.updatedAt, assigneeId: v || null });
                  }}
                  options={[
                    { value: '', label: t('tasks.unassigned') },
                    ...members.map(m => ({
                      value: m.userId,
                      label: m.name || m.email,
                    })),
                  ]}
                  size="sm"
                />
                {task.assigneeId && (() => {
                  const assignee = members.find(m => m.userId === task.assigneeId);
                  return assignee ? (
                    <Avatar name={assignee.name} email={assignee.email} size={22} />
                  ) : null;
                })()}
              </div>
            </div>
          )}

          {/* Visibility */}
          <div className="task-detail-field">
            <span className="task-detail-label">{t('common.visibility')}</span>
            <VisibilityToggle
              visibility={(task.visibility as 'private' | 'team') || 'private'}
              onToggle={(v) => updateVisibility.mutate({ id: task.id, visibility: v })}
              disabled={!isOwner || !canEdit}
            />
          </div>
        </div>

        {/* Subtasks */}
        <SubtaskSection taskId={task.id} />

        {/* Dependencies (blocked by) */}
        <DependencySection taskId={task.id} allTasks={allTasks} />

        {/* Attachments */}
        <AttachmentSection taskId={task.id} />

        {/* Time tracking */}
        <TaskTimeSection task={task} projects={projects} />

        {/* Rich notes editor (below details) */}
        <div style={{ paddingTop: 16 }}>
          <TaskNotesEditor
            content={task.description || task.notes || ''}
            readOnly={!canEdit}
            onChange={(html) => {
              if (!canEdit) return;
              autoSave({ description: html || null });
            }}
            placeholder={t('tasks.addNotes')}
          />
        </div>

        {/* Comments */}
        <CommentSection taskId={task.id} />

        {/* Activity log */}
        <ActivitySection taskId={task.id} />
      </div>
    </div>
  );
}
