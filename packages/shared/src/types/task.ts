// ─── Task types ─────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'completed' | 'cancelled';
export type TaskWhen = 'inbox' | 'today' | 'evening' | 'anytime' | 'someday';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high';
export type TaskType = 'task' | 'heading';

export interface Task {
  id: string;
  accountId: string;
  userId: string;
  projectId: string | null;
  title: string;
  notes: string | null;
  description: string | null;
  icon: string | null;
  type: TaskType;
  headingId: string | null;
  status: TaskStatus;
  when: TaskWhen;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  sortOrder: number;
  tags: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskProject {
  id: string;
  accountId: string;
  userId: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  notes?: string | null;
  description?: string | null;
  icon?: string | null;
  type?: TaskType;
  headingId?: string | null;
  projectId?: string | null;
  when?: TaskWhen;
  priority?: TaskPriority;
  dueDate?: string | null;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  notes?: string | null;
  description?: string | null;
  icon?: string | null;
  type?: TaskType;
  headingId?: string | null;
  projectId?: string | null;
  status?: TaskStatus;
  when?: TaskWhen;
  priority?: TaskPriority;
  dueDate?: string | null;
  tags?: string[];
  sortOrder?: number;
  isArchived?: boolean;
}

export interface CreateProjectInput {
  title: string;
  color?: string;
  description?: string | null;
  icon?: string | null;
}

export interface UpdateProjectInput {
  title?: string;
  color?: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isArchived?: boolean;
}
