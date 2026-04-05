import { useState } from 'react';
import { ChevronRight, ChevronDown, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskActivities } from '../hooks';

export function ActivitySection({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const { data: activities = [] } = useTaskActivities(taskId);
  const [isExpanded, setIsExpanded] = useState(false);

  if (activities.length === 0) return null;

  function formatAction(activity: any): string {
    if (activity.action === 'created') return t('tasks.activity.created');
    if (activity.action === 'completed') return t('tasks.activity.completed');
    if (activity.action === 'updated' && activity.field) {
      return t('tasks.activity.changedField', { field: activity.field });
    }
    if (activity.action === 'subtask_added') return t('tasks.activity.subtaskAdded');
    if (activity.action === 'subtask_completed') return t('tasks.activity.subtaskCompleted');
    return activity.action;
  }

  function getRelativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('tasks.activity.justNow');
    if (mins < 60) return t('tasks.activity.minutesAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('tasks.activity.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('tasks.activity.daysAgo', { count: days });
  }

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Clock className="w-3 h-3" />
        {t('tasks.activity.title')} ({activities.length})
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 ml-1 border-l-2 border-gray-100 pl-3">
          {activities.slice(0, 20).map((activity: any) => (
            <div key={activity.id} className="text-xs">
              <span className="text-gray-600">{formatAction(activity)}</span>
              <span className="text-gray-400 ml-1.5">{getRelativeTime(activity.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
