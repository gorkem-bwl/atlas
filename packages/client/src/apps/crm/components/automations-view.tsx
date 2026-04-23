import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Zap, Sparkles } from 'lucide-react';
import { isTenantAdmin } from '@atlas-platform/shared';
import { useAuthStore } from '../../../stores/auth-store';
import {
  useWorkflows, useCreateWorkflow, useDeleteWorkflow, useToggleWorkflow,
  useSeedExampleWorkflows,
  type CrmWorkflow, type CrmWorkflowStep, type CrmDealStage,
} from '../hooks';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { AlertBanner } from '../../../components/ui/alert-banner';
import {
  translateWorkflowName,
  translateWorkflowTaskTitle,
  translateWorkflowBody,
  translateWorkflowTag,
} from '../lib/workflow-i18n';
import {
  getTriggerLabel,
  getActionLabel,
  getUpdateFieldOptions,
} from '../lib/workflow-options';

function describeTrigger(workflow: CrmWorkflow, stages: CrmDealStage[], t: (key: string, options?: Record<string, unknown>) => string): string {
  const base = getTriggerLabel(workflow.trigger, t);
  const config = workflow.triggerConfig;

  if (workflow.trigger === 'deal_stage_changed') {
    const fromName = config.fromStage ? stages.find((s) => s.id === config.fromStage)?.name : null;
    const toName = config.toStage ? stages.find((s) => s.id === config.toStage)?.name : null;
    if (fromName && toName) return `${base}: "${fromName}" → "${toName}"`;
    if (toName) return `${base}: → "${toName}"`;
    if (fromName) return `${base}: "${fromName}" →`;
    return base;
  }

  if (workflow.trigger === 'activity_logged' && config.activityType) {
    const typeKey = `crm.activities.${config.activityType}`;
    return t('crm.automations.triggerActivityLoggedOfType', { type: t(typeKey) });
  }

  return base;
}

function describeFirstStep(step: CrmWorkflowStep, stages: CrmDealStage[], t: (key: string) => string): string {
  const config = step.actionConfig;

  switch (step.action) {
    case 'create_task':
      return `${t('crm.automations.actionCreateTask')}: "${translateWorkflowTaskTitle((config.taskTitle as string) || '', t)}"`;
    case 'update_field': {
      const fieldLabel = config.fieldName
        ? (getUpdateFieldOptions(t).find((o) => o.value === config.fieldName)?.label ?? String(config.fieldName))
        : '';
      return `${t('crm.automations.actionUpdateField')}: ${fieldLabel} = "${config.fieldValue || ''}"`;
    }
    case 'change_deal_stage': {
      const stageName = stages.find((s) => s.id === config.newStageId)?.name ?? '';
      return `${t('crm.automations.actionChangeDealStage')}: "${stageName}"`;
    }
    case 'add_tag':
      return `${t('crm.automations.actionAddTag')}: "${translateWorkflowTag((config.tag as string) || '', t)}"`;
    case 'assign_user':
      return `${t('crm.automations.actionAssignUser')}: ${config.assignedUserId || ''}`;
    case 'log_activity':
      return `${t('crm.automations.actionLogActivity')}: "${translateWorkflowBody((config.body as string) || '', t)}"`;
    case 'send_notification':
      return `${t('crm.automations.actionSendNotification')}: "${config.message || ''}"`;
    default:
      return getActionLabel(step.action, t);
  }
}

// ─── Main View ────────────────────────────────────────────────────

export function AutomationsView({ stages }: { stages: CrmDealStage[] }) {
  const { t } = useTranslation();
  const [, setSearchParams] = useSearchParams();
  const { data: workflowsData, isLoading } = useWorkflows();
  const workflows = workflowsData?.workflows ?? [];
  const createWorkflow = useCreateWorkflow();
  const toggleWorkflow = useToggleWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const seedWorkflows = useSeedExampleWorkflows();
  const tenantRole = useAuthStore((s) => s.tenantRole);
  const isAdmin = isTenantAdmin(tenantRole);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const navigateToEditor = (workflowId: string) => {
    setSearchParams({ view: 'automation-edit', workflowId }, { replace: true });
  };

  const handleNewAutomation = () => {
    createWorkflow.mutate(
      {
        name: t('crm.automations.newAutomation'),
        trigger: 'deal_stage_changed',
        triggerConfig: {},
        steps: [{ action: 'create_task', actionConfig: { taskTitle: '' } }],
      },
      {
        onSuccess: (workflow) => {
          navigateToEditor(workflow.id);
        },
      },
    );
  };

  // Auto-seed example workflows on first visit if none exist (only for admins/owners)
  const hasSeeded = useRef(false);
  useEffect(() => {
    if (isAdmin && !isLoading && workflows.length === 0 && !hasSeeded.current && !seedWorkflows.isPending) {
      hasSeeded.current = true;
      seedWorkflows.mutate();
    }
  }, [isAdmin, isLoading, workflows.length, seedWorkflows]);

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
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={handleNewAutomation} disabled={createWorkflow.isPending}>
          {createWorkflow.isPending ? t('common.loading') : t('crm.automations.newAutomation')}
        </Button>
      </div>

      {/* Automation status info */}
      {workflows.length > 0 && (
        <AlertBanner variant="info" style={{ marginBottom: 'var(--spacing-md)' }}>
          {t('crm.automations.executionNote')}
        </AlertBanner>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', minWidth: 0 }}>
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              onClick={() => navigateToEditor(workflow.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: workflow.isActive ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                opacity: workflow.isActive ? 1 : 0.7,
                cursor: 'pointer',
                minWidth: 0,
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
                  {translateWorkflowName(workflow.name, t)}
                </div>
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {describeTrigger(workflow, stages, t)} &rarr;{' '}
                  {workflow.steps.length > 0
                    ? describeFirstStep(workflow.steps[0], stages, t)
                    : t('crm.automations.editor.noSteps')}
                  {workflow.steps.length > 1 && (
                    <span style={{ marginLeft: 4, color: 'var(--color-text-tertiary)' }}>
                      +{workflow.steps.length - 1} {t('crm.automations.editor.moreSteps')}
                    </span>
                  )}
                </div>
              </div>

              {/* Execution count */}
              <span style={{ flexShrink: 0 }}>
                <Badge variant="default">
                  {workflow.executionCount} {t('crm.automations.runs')}
                </Badge>
              </span>

              {/* Toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleWorkflow.mutate(workflow.id); }}
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
                title={workflow.isActive ? t('crm.automations.disable') : t('crm.automations.enable')}
              >
                <span style={{
                  position: 'absolute',
                  top: 2,
                  left: workflow.isActive ? 18 : 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-bg-elevated)',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                }} />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteId(workflow.id); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: 'var(--color-text-tertiary)',
                  flexShrink: 0,
                  borderRadius: 'var(--radius-sm)',
                }}
                title={t('crm.actions.delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

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
