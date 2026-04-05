import { ChevronDown, X } from 'lucide-react';
import type { Task } from '@atlasmail/shared';
import { useMyAppPermission } from '../../../hooks/use-app-permissions';
import { IconButton } from '../../../components/ui/icon-button';

export function HeadingRow({
  task,
  childCount,
  isCollapsed,
  onToggle,
  onDelete,
}: {
  task: Task;
  childCount: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { data: tasksPerm } = useMyAppPermission('tasks');
  const canDelete = !tasksPerm || tasksPerm.role === 'admin';
  return (
    <div className="task-heading-row">
      <button className="task-heading-toggle" onClick={onToggle}>
        <ChevronDown size={13} className={`task-section-chevron${isCollapsed ? ' collapsed' : ''}`} />
      </button>
      <span className="task-heading-title">{task.title}</span>
      <span className="task-heading-count">{childCount}</span>
      {canDelete && (
        <IconButton
          icon={<X size={12} />}
          label="Delete section"
          size={24}
          destructive
          className="task-heading-delete"
          onClick={onDelete}
        />
      )}
    </div>
  );
}
