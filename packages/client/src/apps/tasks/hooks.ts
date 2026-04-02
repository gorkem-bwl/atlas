import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api-client';
import { queryKeys } from '../../config/query-keys';
import type {
  Task, TaskProject,
  CreateTaskInput, UpdateTaskInput,
  CreateProjectInput, UpdateProjectInput,
  Subtask, TaskActivity, TaskTemplate, TaskComment,
  CreateTaskTemplateInput, UpdateTaskTemplateInput,
  TaskAttachment, TaskDependency,
} from '@atlasmail/shared';

// ─── Task Queries ───────────────────────────────────────────────────

interface ListTasksResponse { tasks: Task[]; }
interface ListProjectsResponse { projects: TaskProject[]; }

export function useTaskList(filters?: {
  status?: string;
  when?: string;
  projectId?: string | null;
  assigneeId?: string;
  includeArchived?: boolean;
}, options?: { enabled?: boolean }) {
  const filterKey = filters ? JSON.stringify(filters) : '';
  return useQuery({
    queryKey: queryKeys.tasks.list(filterKey),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.when) params.set('when', filters.when);
      if (filters?.projectId !== undefined) params.set('projectId', filters.projectId === null ? 'null' : filters.projectId);
      if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters?.includeArchived) params.set('includeArchived', 'true');
      const qs = params.toString();
      const { data } = await api.get(`/tasks${qs ? `?${qs}` : ''}`);
      return data.data as ListTasksResponse;
    },
    staleTime: 15_000,
    enabled: options?.enabled,
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id!),
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data.data as Task;
    },
    enabled: !!id,
    staleTime: 10_000,
  });
}

export function useTaskCounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.tasks.counts,
    queryFn: async () => {
      const { data } = await api.get('/tasks/counts');
      return data.data as {
        inbox: number;
        today: number;
        upcoming: number;
        anytime: number;
        someday: number;
        logbook: number;
        total: number;
      };
    },
    staleTime: 15_000,
    enabled: options?.enabled,
  });
}

// ─── Task Mutations ─────────────────────────────────────────────────

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await api.post('/tasks', input);
      return data.data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTaskInput & { id: string }) => {
      const { data } = await api.patch(`/tasks/${id}`, input);
      return data.data as Task;
    },
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/tasks/${id}/restore`);
      return data.data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// ─── Project Queries & Mutations ────────────────────────────────────

export function useProjectList(includeArchived = false) {
  return useQuery({
    queryKey: includeArchived ? [...queryKeys.tasks.projects, 'archived'] : queryKeys.tasks.projects,
    queryFn: async () => {
      const params = includeArchived ? '?includeArchived=true' : '';
      const { data } = await api.get(`/tasks/projects/list${params}`);
      return data.data as ListProjectsResponse;
    },
    staleTime: 30_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data } = await api.post('/tasks/projects', input);
      return data.data as TaskProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.projects });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProjectInput & { id: string }) => {
      const { data } = await api.patch(`/tasks/projects/${id}`, input);
      return data.data as TaskProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.projects });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tasks/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// ─── Reorder Mutation ──────────────────────────────────────────────

export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      await api.patch('/tasks/reorder', { taskIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// ─── Subtask Hooks ──────────────────────────────────────────────────

export function useSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.subtasks(taskId!),
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}/subtasks`);
      return data.data as Subtask[];
    },
    enabled: !!taskId,
    staleTime: 10_000,
  });
}

export function useCreateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const { data } = await api.post(`/tasks/${taskId}/subtasks`, { title });
      return data.data as Subtask;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.subtasks(vars.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ subtaskId, taskId, ...input }: { subtaskId: string; taskId: string; title?: string; isCompleted?: boolean }) => {
      const { data } = await api.patch(`/tasks/subtasks/${subtaskId}`, input);
      return data.data as Subtask;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.subtasks(vars.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ subtaskId, taskId }: { subtaskId: string; taskId: string }) => {
      await api.delete(`/tasks/subtasks/${subtaskId}`);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.subtasks(vars.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// ─── Comment Hooks ──────────────────────────────────────────────────

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.comments(taskId!),
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}/comments`);
      return data.data as TaskComment[];
    },
    enabled: !!taskId,
    staleTime: 10_000,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: string }) => {
      const { data } = await api.post(`/tasks/${taskId}/comments`, { body });
      return data.data as TaskComment;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(vars.taskId) });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, taskId }: { commentId: string; taskId: string }) => {
      await api.delete(`/tasks/comments/${commentId}`);
      return taskId;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(vars.taskId) });
    },
  });
}

// ─── Activity Hooks ─────────────────────────────────────────────────

export function useTaskActivities(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.activities(taskId!),
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}/activities`);
      return data.data as TaskActivity[];
    },
    enabled: !!taskId,
    staleTime: 30_000,
  });
}

// ─── Template Hooks ─────────────────────────────────────────────────

export function useTaskTemplates() {
  return useQuery({
    queryKey: queryKeys.tasks.templates,
    queryFn: async () => {
      const { data } = await api.get('/tasks/templates/list');
      return data.data as TaskTemplate[];
    },
    staleTime: 60_000,
  });
}

export function useCreateTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTaskTemplateInput) => {
      const { data } = await api.post('/tasks/templates', input);
      return data.data as TaskTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.templates });
    },
  });
}

export function useDeleteTaskTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      await api.delete(`/tasks/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.templates });
    },
  });
}

export function useCreateTaskFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data } = await api.post(`/tasks/from-template/${templateId}`);
      return data.data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useCreateTaskFromEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ emailId, subject }: { emailId: string; subject: string }) => {
      const { data } = await api.post('/tasks/from-email', { emailId, subject });
      return data.data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// ─── Visibility ────────────────────────────────────────────────────

export function useUpdateTaskVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: 'private' | 'team' }) => {
      await api.patch(`/tasks/${id}/visibility`, { visibility });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useUpdateProjectVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visibility }: { id: string; visibility: 'private' | 'team' }) => {
      await api.patch(`/tasks/projects/${id}/visibility`, { visibility });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

// ─── Attachment Hooks ──────────────────────────────────────────────

export function useTaskAttachments(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.attachments(taskId!),
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}/attachments`);
      return data.data as TaskAttachment[];
    },
    enabled: !!taskId,
    staleTime: 10_000,
  });
}

export function useAddAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data.data as TaskAttachment;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.attachments(vars.taskId) });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ attachmentId, taskId }: { attachmentId: string; taskId: string }) => {
      await api.delete(`/tasks/attachments/${attachmentId}`);
      return taskId;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.attachments(vars.taskId) });
    },
  });
}

// ─── Dependency Hooks ──────────────────────────────────────────────

export function useTaskDependencies(taskId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.dependencies(taskId!),
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${taskId}/dependencies`);
      return data.data as TaskDependency[];
    },
    enabled: !!taskId,
    staleTime: 10_000,
  });
}

export function useAddDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, blockedByTaskId }: { taskId: string; blockedByTaskId: string }) => {
      const { data } = await api.post(`/tasks/${taskId}/dependencies`, { blockedByTaskId });
      return data.data as TaskDependency;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dependencies(vars.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.blockedIds });
    },
  });
}

export function useRemoveDependency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, blockerTaskId }: { taskId: string; blockerTaskId: string }) => {
      await api.delete(`/tasks/${taskId}/dependencies/${blockerTaskId}`);
      return taskId;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.dependencies(vars.taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.blockedIds });
    },
  });
}

export function useBlockedTaskIds() {
  return useQuery({
    queryKey: queryKeys.tasks.blockedIds,
    queryFn: async () => {
      const { data } = await api.get('/tasks/blocked-ids');
      return data.data as string[];
    },
    staleTime: 15_000,
  });
}
