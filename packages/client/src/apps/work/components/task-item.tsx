import { useState, useRef, useEffect, memo } from 'react';
import {
  Check, ChevronRight, GripVertical, Hash, Repeat, FileText, Play, Square,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskProject, TenantUser } from '@atlas-platform/shared';
import { isDoneStatus } from '@atlas-platform/shared';
import { useTasksSettingsStore } from '../settings-store';
import { useAppActions } from '../../../hooks/use-app-permissions';
import { useActiveTimer, useStartTaskTimer, useStopTimer } from '../hooks';
import { useAuthStore } from '../../../stores/auth-store';
import { getDueBadgeClass, formatDueDate } from '../lib/helpers';
import { normalizePriority } from '../lib/constants';
import { WhenBadge } from './when-badge';
import { Avatar } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';

function TaskItemInner({
  task,
  isSelected,
  onClick,
  onComplete,
  onTitleSave,
  projects,
  members,
  showWhenBadge,
  showProject = true,
  showDueDate = true,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDropTarget,
  isChecked,
  onCheckToggle,
  showCheckbox,
  isBlocked,
}: {
  task: Task;
  isSelected: boolean;
  onClick: () => void;
  onComplete: () => void;
  onTitleSave: (title: string) => void;
  projects: TaskProject[];
  members?: TenantUser[];
  showWhenBadge: boolean;
  showProject?: boolean;
  showDueDate?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDragOver?: (e: React.DragEvent, taskId: string) => void;
  onDrop?: (e: React.DragEvent, taskId: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  isChecked?: boolean;
  onCheckToggle?: (taskId: string) => void;
  showCheckbox?: boolean;
  isBlocked?: boolean;
}) {
  const { t } = useTranslation();
  const tasksSettings = useTasksSettingsStore();
  const { canEdit, canCreate } = useAppActions('work');
  const currentUserId = useAuthStore((s) => s.account?.userId);
  const { data: activeTimer } = useActiveTimer();
  const startTimer = useStartTaskTimer();
  const stopTimer = useStopTimer();
  const isTimerRunning = activeTimer?.taskId === task.id;

  const handleTimerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTimerRunning) stopTimer.mutate(task.id);
    else if (task.projectId) startTimer.mutate({ taskId: task.id, projectId: task.projectId });
  };
  const [completing, setCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [isEditing]);

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    if (isDoneStatus(task.status)) {
      onComplete(); // uncomplete immediately
      return;
    }
    setCompleting(true);
    setTimeout(() => onComplete(), 800);
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTitleSave = () => {
    setIsEditing(false);
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onTitleSave(trimmed);
    } else {
      setEditTitle(task.title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(task.title);
    }
  };

  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;

  return (
    <div
      className={`task-item${isSelected ? ' selected' : ''}${completing ? ' completing' : ''}${isDragging ? ' dragging' : ''}${isDropTarget ? ' drop-target' : ''}`}
      data-task-id={task.id}
      onClick={onClick}
      onDragOver={e => onDragOver?.(e, task.id)}
      onDrop={e => onDrop?.(e, task.id)}
    >
      {showCheckbox && (
        <span
          style={{ width: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={(e) => { e.stopPropagation(); onCheckToggle?.(task.id); }}
        >
          <input
            type="checkbox"
            checked={!!isChecked}
            onChange={() => {}}
            style={{ cursor: 'pointer', accentColor: 'var(--color-accent-primary)' }}
          />
        </span>
      )}

      <div
        className="task-drag-handle"
        draggable
        onDragStart={e => onDragStart?.(e, task.id)}
        onDragEnd={onDragEnd}
      >
        <GripVertical size={14} />
      </div>

      <button
        className={`task-checkbox${isDoneStatus(task.status) || completing ? ' completed' : ''}`}
        onClick={handleComplete}
        aria-label={isDoneStatus(task.status) ? t('tasks.markIncomplete') : t('tasks.markComplete')}
      >
        {(isDoneStatus(task.status) || completing) && (
          <Check size={12} color="var(--color-text-inverse)" strokeWidth={3} className="task-check-icon" />
        )}
      </button>

      <div className="task-item-content">
        <div className="task-item-title-row">
          {task.priority !== 'none' && (
            <div className={`task-priority-dot ${normalizePriority(task.priority)}`} />
          )}
          {task.icon && <span className="task-item-emoji">{task.icon}</span>}
          {isEditing ? (
            <input
              ref={editRef}
              className="task-inline-edit"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleSave}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className={`task-title-text${isDoneStatus(task.status) ? ' completed' : ''}`}
              onClick={handleTitleClick}
            >
              {task.title || t('tasks.untitled')}
            </span>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <span className="ml-1.5 text-[10px] text-gray-400 font-medium">
              {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
            </span>
          )}
          <WhenBadge when={task.when} dueDate={task.dueDate} showBadge={showWhenBadge} />
          {isBlocked && <Badge variant="warning">{t('tasks.blocked')}</Badge>}
        </div>

        {((showDueDate && task.dueDate) || (showProject && project) || task.tags.length > 0 || task.recurrenceRule) && (
          <div className="task-meta-row">
            {showDueDate && task.dueDate && (
              <span className={getDueBadgeClass(task.dueDate)}>
                {formatDueDate(task.dueDate, t)}
              </span>
            )}
            {task.recurrenceRule && (
              <span className="task-meta-recurrence" title={t('tasks.repeats', { rule: task.recurrenceRule })}>
                <Repeat size={10} />
              </span>
            )}
            {showProject && project && (
              <span className="task-meta-project">
                {project.icon ? (
                  <span className="task-meta-project-emoji">{project.icon}</span>
                ) : (
                  <div className="task-project-dot" style={{ background: project.color }} />
                )}
                {project.title}
              </span>
            )}
            {task.tags.length > 0 && (
              <span className="task-meta-tags">
                <Hash size={10} />
                {task.tags[0]}
                {task.tags.length > 1 && ` +${task.tags.length - 1}`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Assignee avatar */}
      {task.assigneeId && members && (() => {
        const assignee = members.find(m => m.userId === task.assigneeId);
        return assignee ? (
          <span title={assignee.name || assignee.email} style={{ flexShrink: 0 }}>
            <Avatar name={assignee.name} email={assignee.email} size={20} />
          </span>
        ) : null;
      })()}

      {/* Creator badge for team tasks */}
      {task.visibility === 'team' && task.userId !== currentUserId && task.creatorName && (
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)', flexShrink: 0 }}>
          {t('tasks.createdBy', { name: task.creatorName })}
        </span>
      )}

      {/* Time-tracking toggle — only tasks attached to a project are trackable.
          Shows on hover via .task-track-btn unless the timer is running here. */}
      {canCreate && task.projectId && (
        <button
          type="button"
          className={`task-track-btn${isTimerRunning ? ' running' : ''}`}
          onClick={handleTimerToggle}
          title={isTimerRunning ? t('tasks.stopTimer', 'Stop timer') : t('tasks.startTimer', 'Start timer')}
          aria-label={isTimerRunning ? t('tasks.stopTimer', 'Stop timer') : t('tasks.startTimer', 'Start timer')}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
            border: 'none', background: 'transparent',
            color: isTimerRunning ? 'var(--color-danger)' : 'var(--color-text-tertiary)',
          }}
        >
          {isTimerRunning ? <Square size={13} /> : <Play size={13} />}
        </button>
      )}

      {/* Notes indicator (respects settings) */}
      {tasksSettings.showNotesIndicator && (task.description || task.notes) && (
        <FileText size={13} className="task-notes-indicator" />
      )}

      {isSelected && (
        <ChevronRight size={14} color="var(--color-text-tertiary)" style={{ flexShrink: 0, marginTop: 3 }} />
      )}
    </div>
  );
}

export const TaskItem = memo(TaskItemInner);
