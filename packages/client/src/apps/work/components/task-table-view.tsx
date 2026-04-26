import { useState, memo } from 'react';
import { Check, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Task, TaskProject, TenantUser } from '@atlas-platform/shared';
import { isDoneStatus } from '@atlas-platform/shared';
import { getDueBadgeClass, formatDueDate } from '../lib/helpers';
import { Avatar } from '../../../components/ui/avatar';

type SortKey = 'title' | 'project' | 'priority' | 'dueDate' | 'assignee';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 };

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={11} style={{ opacity: 0.35 }} />;
  return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
}

function TaskTableViewInner({
  tasks,
  projects,
  members,
  selectedTaskId,
  selectedIds,
  onSelectTask,
  onComplete,
  onCheckToggle,
}: {
  tasks: Task[];
  projects: TaskProject[];
  members?: TenantUser[];
  selectedTaskId: string | null;
  selectedIds: Set<string>;
  onSelectTask: (id: string) => void;
  onComplete: (id: string) => void;
  onCheckToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortKey === 'project') {
      const pa = projects.find(p => p.id === a.projectId)?.title ?? '';
      const pb = projects.find(p => p.id === b.projectId)?.title ?? '';
      cmp = pa.localeCompare(pb);
    } else if (sortKey === 'priority') {
      cmp = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
    } else if (sortKey === 'dueDate') {
      const da = a.dueDate ?? '9999';
      const db = b.dueDate ?? '9999';
      cmp = da.localeCompare(db);
    } else if (sortKey === 'assignee') {
      const ua = members?.find(m => m.userId === a.assigneeId)?.name ?? '';
      const ub = members?.find(m => m.userId === b.assigneeId)?.name ?? '';
      cmp = ua.localeCompare(ub);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const thStyle: React.CSSProperties = {
    padding: '6px var(--spacing-md)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--color-text-tertiary)',
    fontFamily: 'var(--font-family)',
    textAlign: 'left',
    borderBottom: '1px solid var(--color-border-secondary)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    cursor: 'pointer',
  };

  const tdStyle: React.CSSProperties = {
    padding: '7px var(--spacing-md)',
    fontSize: 'var(--font-size-sm)',
    fontFamily: 'var(--font-family)',
    borderBottom: '1px solid var(--color-border-secondary)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 36 }} />
          <col style={{ width: 36 }} />
          <col style={{ minWidth: 200 }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '16%' }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...thStyle, cursor: 'default' }} />
            <th style={{ ...thStyle, cursor: 'default' }} />
            <th style={thStyle} onClick={() => handleSort('title')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('tasks.fields.title')} <SortIcon col="title" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th style={thStyle} onClick={() => handleSort('project')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('tasks.fields.project')} <SortIcon col="project" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th style={thStyle} onClick={() => handleSort('priority')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('tasks.fields.priority')} <SortIcon col="priority" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th style={thStyle} onClick={() => handleSort('dueDate')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('tasks.fields.dueDate')} <SortIcon col="dueDate" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
            <th style={thStyle} onClick={() => handleSort('assignee')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t('tasks.fields.assignee')} <SortIcon col="assignee" sortKey={sortKey} sortDir={sortDir} />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(task => {
            const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
            const assignee = task.assigneeId ? members?.find(m => m.userId === task.assigneeId) : null;
            const done = isDoneStatus(task.status);
            const isSelected = selectedTaskId === task.id;

            return (
              <tr
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                style={{
                  cursor: 'pointer',
                  background: isSelected ? 'var(--color-surface-selected)' : undefined,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)'; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = ''; }}
              >
                {/* Checkbox */}
                <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => { e.stopPropagation(); onCheckToggle(task.id); }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(task.id)}
                    onChange={() => {}}
                    style={{ cursor: 'pointer', accentColor: 'var(--color-accent-primary)' }}
                  />
                </td>

                {/* Complete button */}
                <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => { e.stopPropagation(); onComplete(task.id); }}>
                  <button
                    className={`task-checkbox${done ? ' completed' : ''}`}
                    style={{ margin: '0 auto' }}
                    aria-label={done ? t('tasks.markIncomplete') : t('tasks.markComplete')}
                  >
                    {done && <Check size={12} color="var(--color-text-inverse)" strokeWidth={3} className="task-check-icon" />}
                  </button>
                </td>

                {/* Title */}
                <td style={{ ...tdStyle, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {task.priority !== 'none' && <div className={`task-priority-dot ${task.priority}`} style={{ flexShrink: 0 }} />}
                    {task.icon && <span>{task.icon}</span>}
                    <span className={done ? 'task-title-text completed' : ''} style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.title || t('tasks.untitled')}
                    </span>
                  </span>
                </td>

                {/* Project */}
                <td style={{ ...tdStyle, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {project ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {project.icon
                        ? <span style={{ fontSize: 11 }}>{project.icon}</span>
                        : <div className="task-project-dot" style={{ background: project.color, flexShrink: 0 }} />}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.title}</span>
                    </span>
                  ) : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                </td>

                {/* Priority */}
                <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                  {task.priority !== 'none'
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div className={`task-priority-dot ${task.priority}`} />
                        {t(`tasks.priority.${task.priority}`)}
                      </span>
                    : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                </td>

                {/* Due date */}
                <td style={tdStyle}>
                  {task.dueDate
                    ? <span className={getDueBadgeClass(task.dueDate)}>{formatDueDate(task.dueDate, t)}</span>
                    : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                </td>

                {/* Assignee */}
                <td style={tdStyle}>
                  {assignee
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Avatar name={assignee.name} email={assignee.email} size={20} />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {assignee.name || assignee.email}
                        </span>
                      </span>
                    : <span style={{ color: 'var(--color-text-tertiary)' }}>—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)' }}>
          {t('tasks.noTasks')}
        </div>
      )}
    </div>
  );
}

export const TaskTableView = memo(TaskTableViewInner);
