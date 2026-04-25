import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { requireAppPermission } from '../../middleware/require-app-permission';
import { withConcurrencyCheck } from '../../middleware/concurrency-check';
import { tasks, projectProjects, projectTimeEntries, taskStatuses } from '../../db/schema';
import * as controller from './controller';
import * as taskStatusController from './controllers/task-statuses.controller';

const router = Router();

router.use(authMiddleware);
router.use(requireAppPermission('work'));

// Tenant-wide work settings (admin-only mutation via canAccess gate)
router.get('/settings', controller.getWorkSettings);
router.patch('/settings', controller.updateWorkSettings);

// Task statuses (per-tenant)
router.get('/task-statuses', taskStatusController.listStatuses);
router.post('/task-statuses', taskStatusController.createStatus);
router.patch('/task-statuses/reorder', taskStatusController.reorderStatuses);
router.patch('/task-statuses/:id', withConcurrencyCheck(taskStatuses), taskStatusController.updateStatus);
router.delete('/task-statuses/:id', taskStatusController.archiveStatus);

// Tasks
router.get('/tasks', controller.listTasks);
router.post('/tasks', controller.createTask);
router.get('/tasks/search', controller.searchTasks);
router.get('/tasks/counts', controller.getTaskCounts);
router.get('/tasks/blocked', controller.getBlockedTaskIds);
// Collection-level mutations must be declared before /:id so Express
// doesn't match "reorder" / "bulk" as an id parameter.
router.patch('/tasks/reorder', controller.reorderTasks);
router.delete('/tasks/bulk', controller.bulkDeleteTasks);
router.get('/tasks/:id', controller.getTask);
router.patch('/tasks/:id', withConcurrencyCheck(tasks), controller.updateTask);
router.patch('/tasks/:id/visibility', controller.updateTaskVisibility);
router.delete('/tasks/:id', controller.deleteTask);

// Task subtasks
router.get('/tasks/:id/subtasks', controller.listSubtasks);
router.post('/tasks/:id/subtasks', controller.createSubtask);
router.patch('/tasks/:id/subtasks/:subtaskId', controller.updateSubtask);
router.delete('/tasks/:id/subtasks/:subtaskId', controller.deleteSubtask);
router.post('/tasks/:id/subtasks/reorder', controller.reorderSubtasks);

// Task activities
router.get('/tasks/:id/activities', controller.listActivities);

// Task comments
router.get('/tasks/:taskId/comments', controller.listComments);
router.post('/tasks/:taskId/comments', controller.createComment);
router.delete('/tasks/:taskId/comments/:commentId', controller.deleteComment);

// Task attachments
router.get('/tasks/:taskId/attachments', controller.listAttachments);
router.post('/tasks/:taskId/attachments', controller.uploadAttachment);
router.get('/tasks/:taskId/attachments/:attachmentId/download', controller.downloadAttachment);
router.delete('/tasks/:taskId/attachments/:attachmentId', controller.deleteAttachment);

// Task dependencies
router.get('/tasks/:taskId/dependencies', controller.listDependencies);
router.post('/tasks/:taskId/dependencies', controller.addDependency);
router.delete('/tasks/:taskId/dependencies/:blockerTaskId', controller.removeDependency);

// Task templates
router.get('/templates', controller.listTemplates);
router.post('/templates', controller.createTemplate);
router.patch('/templates/:templateId', controller.updateTemplate);
router.delete('/templates/:templateId', controller.deleteTemplate);
router.post('/templates/:templateId/use', controller.createTaskFromTemplate);

// Flat time entries (cross-project)
router.get('/time-entries', controller.listTimeEntries);
router.post('/time-entries', controller.createTimeEntry);
router.patch('/time-entries/:id', withConcurrencyCheck(projectTimeEntries), controller.updateTimeEntry);
router.delete('/time-entries/:id', controller.deleteTimeEntry);

// Time billing (preview + populate into invoice)
router.post('/projects/time-billing/preview', controller.previewTimeBilling);
router.post('/projects/time-billing/populate', controller.populateFromTimeBilling);

// Dashboard
router.get('/projects/dashboard', controller.getDashboard);

// Projects
router.get('/projects', controller.listProjects);
router.post('/projects', controller.createProject);
router.get('/projects/:id', controller.getProject);
router.patch('/projects/:id', withConcurrencyCheck(projectProjects), controller.updateProject);
router.delete('/projects/:id', controller.deleteProject);

// Project members
router.get('/projects/:id/members', controller.listProjectMembers);
router.post('/projects/:id/members', controller.addProjectMember);
router.patch('/projects/:id/members/:memberId/rate', controller.updateProjectMemberRate);
router.delete('/projects/:id/members/:memberId', controller.removeProjectMember);

// Project time entries
router.get('/projects/:id/time-entries', controller.listProjectTimeEntries);
router.post('/projects/:id/time-entries', controller.createProjectTimeEntry);
router.patch('/projects/:id/time-entries/:entryId', withConcurrencyCheck(projectTimeEntries), controller.updateProjectTimeEntry);
router.delete('/projects/:id/time-entries/:entryId', controller.deleteProjectTimeEntry);

// Project files and financials
router.get('/projects/:id/files', controller.listProjectFiles);
router.post('/projects/:id/files', controller.addProjectFile);
router.delete('/projects/:id/files/:driveItemId', controller.removeProjectFile);
router.get('/projects/:id/financials', controller.getProjectFinancials);

export default router;
