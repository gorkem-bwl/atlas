import { createAppSettingsHook } from '../../lib/create-app-settings-store';

export type TaskDefaultView = 'inbox' | 'today' | 'anytime';
export type TaskCompletedBehavior = 'fade' | 'move' | 'hide';
export type TaskSortOrder = 'manual' | 'priority' | 'dueDate' | 'title' | 'created';
export type TaskViewMode = 'list' | 'board' | 'table';

interface TasksSettings {
  defaultView: TaskDefaultView;
  confirmBeforeDelete: boolean;
  showCalendarInToday: boolean;
  showEveningSection: boolean;
  showWhenBadges: boolean;
  showProjectInList: boolean;
  showNotesIndicator: boolean;
  compactMode: boolean;
  completedBehavior: TaskCompletedBehavior;
  defaultSortOrder: TaskSortOrder;
  viewMode: TaskViewMode;
}

export const useTasksSettingsStore = createAppSettingsHook<TasksSettings>({
  defaults: {
    defaultView: 'inbox',
    confirmBeforeDelete: true,
    showCalendarInToday: true,
    showEveningSection: true,
    showWhenBadges: true,
    showProjectInList: true,
    showNotesIndicator: true,
    compactMode: false,
    completedBehavior: 'fade',
    defaultSortOrder: 'manual',
    viewMode: 'list',
  },
  fieldMapping: {
    defaultView: 'workTasksDefaultView',
    confirmBeforeDelete: 'workTasksConfirmDelete',
    showCalendarInToday: 'workTasksShowCalendar',
    showEveningSection: 'workTasksShowEvening',
    showWhenBadges: 'workTasksShowWhenBadges',
    showProjectInList: 'workTasksShowProject',
    showNotesIndicator: 'workTasksShowNotesIndicator',
    compactMode: 'workTasksCompactMode',
    completedBehavior: 'workTasksCompletedBehavior',
    defaultSortOrder: 'workTasksDefaultSort',
    viewMode: 'workTasksViewMode',
  },
});
