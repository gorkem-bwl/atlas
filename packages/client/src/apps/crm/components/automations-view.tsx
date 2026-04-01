import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Zap, Sparkles, Info } from 'lucide-react';
import {
  useWorkflows, useCreateWorkflow, useDeleteWorkflow, useToggleWorkflow,
  useSeedExampleWorkflows,
  type CrmWorkflow, type CrmDealStage,
} from '../hooks';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Modal } from '../../../components/ui/modal';
import { Badge } from '../../../components/ui/badge';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';

// ─── Constants ────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: 'deal_stage_changed', label: 'Deal stage changed' },
  { value: 'deal_created', label: 'Deal created' },
  { value: 'deal_won', label: 'Deal won' },
  { value: 'deal_lost', label: 'Deal lost' },
  { value: 'contact_created', label: 'Contact created' },
  { value: 'activity_logged', label: 'Activity logged' },
];

const ACTION_OPTIONS = [
  { value: 'create_task', label: 'Create task' },
  { value: 'update_field', label: 'Update field' },
  { value: 'change_deal_stage', label: 'Change deal stage' },
  { value: 'add_tag', label: 'Add tag' },
  { value: 'assign_user', label: 'Assign user' },
  { value: 'log_activity', label: 'Log activity' },
  { value: 'send_notification', label: 'Send notification' },
];

const ACTIVITY_TYPE_OPTIONS = [
  { value: '', label: 'Any type' },
  { value: 'note', label: 'Note' },
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'email', label: 'Email' },
];

const FIELD_OPTIONS = [
  { value: 'probability', label: 'Probability' },
  { value: 'value', label: 'Value' },
  { value: 'title', label: 'Title' },
];

// ─── Helpers ──────────────────────────────────────────────────────

function getTriggerLabel(trigger: string): string {
  return TRIGGER_OPTIONS.find((t) => t.value === trigger)?.label ?? trigger;
}

function getActionLabel(action: string): string {
  return ACTION_OPTIONS.find((a) => a.value === action)?.label ?? action;
}

function describeTrigger(workflow: CrmWorkflow, stages: CrmDealStage[]): string {
  const base = getTriggerLabel(workflow.trigger);
  const config = workflow.triggerConfig;

  if (workflow.trigger === 'deal_stage_changed') {
    const fromName = config.fromStage ? stages.find((s) => s.id === config.fromStage)?.name : null;
    const toName = config.toStage ? stages.find((s) => s.id === config.toStage)?.name : null;
    if (fromName && toName) return `Deal moves from "${fromName}" to "${toName}"`;
    if (toName) return `Deal moves to "${toName}"`;
    if (fromName) return `Deal leaves "${fromName}"`;
    return 'Deal stage changes';
  }

  if (workflow.trigger === 'activity_logged' && config.activityType) {
    return `${config.activityType} activity logged`;
  }

  return base;
}

function describeAction(workflow: CrmWorkflow, stages: CrmDealStage[]): string {
  const config = workflow.actionConfig;

  switch (workflow.action) {
    case 'create_task':
      return `Create task "${config.taskTitle || 'Untitled'}"`;
    case 'update_field':
      return `Set ${config.fieldName || 'field'} to "${config.fieldValue || ''}"`;
    case 'change_deal_stage': {
      const stageName = stages.find((s) => s.id === config.newStageId)?.name ?? 'unknown';
      return `Move deal to "${stageName}"`;
    }
    case 'add_tag':
      return `Add tag "${config.tag || ''}"`;
    case 'assign_user':
      return `Assign to user ${config.assignedUserId || 'unknown'}`;
    case 'log_activity':
      return `Log ${config.activityType || 'note'}: "${config.body || ''}"`;
    case 'send_notification':
      return `Send notification: "${config.message || ''}"`;
    default:
      return getActionLabel(workflow.action);
  }
}

// ─── Create Modal ─────────────────────────────────────────────────

function CreateWorkflowModal({
  open,
  onClose,
  stages,
}: {
  open: boolean;
  onClose: () => void;
  stages: CrmDealStage[];
}) {
  const { t } = useTranslation();
  const createWorkflow = useCreateWorkflow();

  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('deal_stage_changed');
  const [action, setAction] = useState('create_task');

  // Trigger config
  const [fromStage, setFromStage] = useState('');
  const [toStage, setToStage] = useState('');
  const [activityType, setActivityType] = useState('');

  // Action config
  const [taskTitle, setTaskTitle] = useState('');
  const [fieldName, setFieldName] = useState('probability');
  const [fieldValue, setFieldValue] = useState('');
  const [newStageId, setNewStageId] = useState('');
  const [tagValue, setTagValue] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [logActivityType, setLogActivityType] = useState('note');
  const [logActivityBody, setLogActivityBody] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  const stageOptions = [
    { value: '', label: 'Any stage' },
    ...stages.map((s) => ({ value: s.id, label: s.name })),
  ];

  const stageOptionsRequired = stages.map((s) => ({ value: s.id, label: s.name }));

  const handleSubmit = () => {
    if (!name.trim()) return;

    const triggerConfig: Record<string, unknown> = {};
    if (trigger === 'deal_stage_changed') {
      if (fromStage) triggerConfig.fromStage = fromStage;
      if (toStage) triggerConfig.toStage = toStage;
    }
    if (trigger === 'activity_logged' && activityType) {
      triggerConfig.activityType = activityType;
    }

    const actionConfig: Record<string, unknown> = {};
    if (action === 'create_task') {
      actionConfig.taskTitle = taskTitle || 'Automated task';
    }
    if (action === 'update_field') {
      actionConfig.fieldName = fieldName;
      actionConfig.fieldValue = fieldValue;
    }
    if (action === 'change_deal_stage') {
      actionConfig.newStageId = newStageId;
    }
    if (action === 'add_tag') {
      actionConfig.tag = tagValue || 'tag';
    }
    if (action === 'assign_user') {
      actionConfig.assignedUserId = assignedUserId;
    }
    if (action === 'log_activity') {
      actionConfig.activityType = logActivityType;
      actionConfig.body = logActivityBody;
    }
    if (action === 'send_notification') {
      actionConfig.message = notificationMessage;
    }

    createWorkflow.mutate(
      { name: name.trim(), trigger, triggerConfig, action, actionConfig },
      {
        onSuccess: () => {
          onClose();
          resetForm();
        },
      },
    );
  };

  const resetForm = () => {
    setName('');
    setTrigger('deal_stage_changed');
    setAction('create_task');
    setFromStage('');
    setToStage('');
    setActivityType('');
    setTaskTitle('');
    setFieldName('probability');
    setFieldValue('');
    setNewStageId('');
    setTagValue('');
    setAssignedUserId('');
    setLogActivityType('note');
    setLogActivityBody('');
    setNotificationMessage('');
  };

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Modal.Header title={t('crm.automations.newAutomation')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <Input
            label="Name"
            placeholder="e.g., Follow up on qualified deals"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>When this happens...</div>
            <Select
              value={trigger}
              onChange={(val) => setTrigger(val)}
              options={TRIGGER_OPTIONS}
            />
          </div>

          {/* Trigger config */}
          {trigger === 'deal_stage_changed' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>From stage</div>
                <Select
                  value={fromStage}
                  onChange={(val) => setFromStage(val)}
                  options={stageOptions}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>To stage</div>
                <Select
                  value={toStage}
                  onChange={(val) => setToStage(val)}
                  options={stageOptions}
                />
              </div>
            </div>
          )}

          {trigger === 'activity_logged' && (
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>Activity type</div>
              <Select
                value={activityType}
                onChange={(val) => setActivityType(val)}
                options={ACTIVITY_TYPE_OPTIONS}
              />
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border-primary)', margin: 'var(--spacing-xs) 0' }} />

          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>Then do this...</div>
            <Select
              value={action}
              onChange={(val) => setAction(val)}
              options={ACTION_OPTIONS}
            />
          </div>

          {/* Action config */}
          {action === 'create_task' && (
            <Input
              label="Task title"
              placeholder="e.g., Schedule demo call"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          )}

          {action === 'update_field' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>Field</div>
                <Select
                  value={fieldName}
                  onChange={(val) => setFieldName(val)}
                  options={FIELD_OPTIONS}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label="New value"
                  placeholder="e.g., 50"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                />
              </div>
            </div>
          )}

          {action === 'change_deal_stage' && (
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>New stage</div>
              <Select
                value={newStageId}
                onChange={(val) => setNewStageId(val)}
                options={stageOptionsRequired}
              />
            </div>
          )}

          {action === 'add_tag' && (
            <Input
              label="Tag to add"
              placeholder="e.g., customer"
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
            />
          )}

          {action === 'assign_user' && (
            <Input
              label="User ID"
              placeholder="Enter user ID to assign"
              value={assignedUserId}
              onChange={(e) => setAssignedUserId(e.target.value)}
            />
          )}

          {action === 'log_activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div>
                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>Activity type</div>
                <Select
                  value={logActivityType}
                  onChange={(val) => setLogActivityType(val)}
                  options={[
                    { value: 'note', label: 'Note' },
                    { value: 'call', label: 'Call' },
                    { value: 'meeting', label: 'Meeting' },
                    { value: 'email', label: 'Email' },
                  ]}
                />
              </div>
              <Input
                label="Activity body"
                placeholder="e.g., Deal was lost. Review and follow up."
                value={logActivityBody}
                onChange={(e) => setLogActivityBody(e.target.value)}
              />
            </div>
          )}

          {action === 'send_notification' && (
            <Input
              label="Notification message"
              placeholder="e.g., A deal was just won!"
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
            />
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" size="sm" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!name.trim() || createWorkflow.isPending}
        >
          {createWorkflow.isPending ? t('common.loading') : t('crm.automations.newAutomation')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Main View ────────────────────────────────────────────────────

export function AutomationsView({ stages }: { stages: CrmDealStage[] }) {
  const { t } = useTranslation();
  const { data: workflowsData, isLoading } = useWorkflows();
  const workflows = workflowsData?.workflows ?? [];
  const toggleWorkflow = useToggleWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const seedWorkflows = useSeedExampleWorkflows();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Auto-seed example workflows on first visit if none exist
  const hasSeeded = useRef(false);
  useEffect(() => {
    if (!isLoading && workflows.length === 0 && !hasSeeded.current && !seedWorkflows.isPending) {
      hasSeeded.current = true;
      seedWorkflows.mutate();
    }
  }, [isLoading, workflows.length, seedWorkflows]);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-2xl)', color: 'var(--color-text-tertiary)' }}>
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-2xl)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-xl)',
      }}>
        <div>
          <div style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
          }}>
            {t('crm.automations.title')}
          </div>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            marginTop: 2,
          }}>
            {t('crm.automations.subtitle')}
          </div>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
          {t('crm.automations.newAutomation')}
        </Button>
      </div>

      {/* Automation status info */}
      {workflows.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-bg-secondary)',
          marginBottom: 'var(--spacing-md)',
          border: '1px solid var(--color-border-secondary)',
        }}>
          <Info size={14} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {t('crm.automations.executionNote')}
          </span>
        </div>
      )}

      {/* Workflow list */}
      {workflows.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--spacing-2xl) 0',
          color: 'var(--color-text-tertiary)',
        }}>
          <Zap size={40} style={{ opacity: 0.3, marginBottom: 'var(--spacing-sm)' }} />
          <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-secondary)' }}>
            {t('crm.automations.noAutomations')}
          </div>
          <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 4, color: 'var(--color-text-tertiary)' }}>
            {t('crm.automations.noAutomationsDesc')}
          </div>
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Sparkles size={14} />}
              onClick={() => seedWorkflows.mutate()}
              disabled={seedWorkflows.isPending}
            >
              {seedWorkflows.isPending ? t('common.loading') : t('crm.automations.seedExamples')}
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: workflow.isActive ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                opacity: workflow.isActive ? 1 : 0.7,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                backgroundColor: workflow.isActive ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Zap size={14} color={workflow.isActive ? '#fff' : 'var(--color-text-tertiary)'} />
              </div>

              {/* Description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {workflow.name}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {describeTrigger(workflow, stages)} &rarr; {describeAction(workflow, stages)}
                </div>
              </div>

              {/* Execution count */}
              <span style={{ flexShrink: 0 }}>
                <Badge variant="default">
                  {workflow.executionCount} {workflow.executionCount === 1 ? 'run' : 'runs'}
                </Badge>
              </span>

              {/* Toggle */}
              <button
                onClick={() => toggleWorkflow.mutate(workflow.id)}
                style={{
                  position: 'relative',
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: workflow.isActive ? 'var(--color-accent-primary)' : 'var(--color-bg-tertiary)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.2s',
                }}
                title={workflow.isActive ? 'Disable automation' : 'Enable automation'}
              >
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: workflow.isActive ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }} />
              </button>

              {/* Delete */}
              <button
                onClick={() => setDeleteId(workflow.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--color-text-tertiary)',
                  flexShrink: 0,
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Delete automation"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateWorkflowModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        stages={stages}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={t('crm.actions.delete')}
        description={t('crm.bulk.deleteDescription')}
        confirmLabel={t('crm.actions.delete')}
        destructive
        onConfirm={() => {
          if (deleteId) deleteWorkflow.mutate(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
