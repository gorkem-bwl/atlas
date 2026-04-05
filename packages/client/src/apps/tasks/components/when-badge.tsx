import { Star, Moon, Calendar } from 'lucide-react';
import type { TaskWhen } from '@atlasmail/shared';
import { formatDueDate } from '../lib/helpers';

export function WhenBadge({ when, dueDate, showBadge }: { when: TaskWhen; dueDate: string | null; showBadge: boolean }) {
  if (!showBadge) return null;

  if (when === 'today') {
    return <span className="task-when-badge today" title="Today"><Star size={12} /></span>;
  }
  if (when === 'evening') {
    return <span className="task-when-badge evening" title="This evening"><Moon size={12} /></span>;
  }
  if (dueDate) {
    return <span className="task-when-badge upcoming" title={formatDueDate(dueDate)}><Calendar size={12} /></span>;
  }
  return null;
}
