import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Check, X, UserPlus, X as XIcon } from 'lucide-react';
import {
  useExpensePolicies, useExpensePolicy,
  useCreateExpensePolicy, useUpdateExpensePolicy, useDeleteExpensePolicy,
  useAssignExpensePolicy, useRemoveExpensePolicyAssignment,
  useEmployeeList, useDepartmentList,
} from '../../hooks';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Skeleton } from '../../../../components/ui/skeleton';
import { IconButton } from '../../../../components/ui/icon-button';
import { FeatureEmptyState } from '../../../../components/ui/feature-empty-state';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';
import { Modal } from '../../../../components/ui/modal';
import { Select } from '../../../../components/ui/select';
import { formatCurrency } from '../../../../lib/format';

export function ExpensePoliciesView() {
  const { t } = useTranslation();
  const { data: policies, isLoading } = useExpensePolicies();
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)' }}>
        <Skeleton height={300} />
      </div>
    );
  }

  if ((!policies || policies.length === 0) && !showCreate) {
    return (
      <FeatureEmptyState
        illustration="generic"
        title={t('hr.expenses.policies.empty')}
        description={t('hr.expenses.policies.emptyDesc')}
        actionLabel={t('hr.expenses.policies.add')}
        actionIcon={<Plus size={14} />}
        onAction={() => setShowCreate(true)}
      />
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', minHeight: 0 }}>
        {/* Left: Policy list */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {policies?.map((policy) => (
            <div
              key={policy.id}
              onClick={() => setSelectedPolicyId(policy.id)}
              style={{
                padding: 'var(--spacing-md)',
                border: '1px solid',
                borderColor: selectedPolicyId === policy.id ? 'var(--color-accent-primary)' : 'var(--color-border-secondary)',
                borderRadius: 'var(--radius-lg)',
                background: selectedPolicyId === policy.id ? 'color-mix(in srgb, var(--color-accent-primary) 5%, var(--color-bg-primary))' : 'var(--color-bg-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--spacing-xs)',
              }}>
                <span style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                }}>
                  {policy.name}
                </span>
                <Badge variant={policy.isActive ? 'primary' : 'default'}>
                  {policy.isActive ? t('hr.status.active') : t('hr.leaveTypes.inactive')}
                </Badge>
              </div>
              <div style={{
                display: 'flex',
                gap: 'var(--spacing-lg)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}>
                {policy.monthlyLimit != null && (
                  <span>{t('hr.expenses.policies.monthlyLimit')}: {formatCurrency(policy.monthlyLimit)}</span>
                )}
                {policy.requireReceiptAbove != null && (
                  <span>{t('hr.expenses.policies.receiptAbove')}: {formatCurrency(policy.requireReceiptAbove)}</span>
                )}
                {policy.autoApproveBelow != null && (
                  <span>{t('hr.expenses.policies.autoApprove')}: {formatCurrency(policy.autoApproveBelow)}</span>
                )}
              </div>
            </div>
          ))}

          <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)} style={{ marginTop: 'var(--spacing-sm)' }}>
            {t('hr.expenses.policies.add')}
          </Button>
        </div>

        {/* Right: Policy detail + assignments */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedPolicyId ? (
            <PolicyDetail policyId={selectedPolicyId} onDelete={() => setSelectedPolicyId(null)} />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 200,
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
            }}>
              {t('hr.expenses.policies.selectHint')}
            </div>
          )}
        </div>
      </div>

      {/* Create policy modal */}
      {showCreate && (
        <CreatePolicyModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

// ─── Policy Detail ──────────────────────────────────────────────

function PolicyDetail({ policyId, onDelete }: { policyId: string; onDelete: () => void }) {
  const { t } = useTranslation();
  const { data: policy, isLoading } = useExpensePolicy(policyId);
  const updatePolicy = useUpdateExpensePolicy();
  const deletePolicy = useDeleteExpensePolicy();
  const assignPolicy = useAssignExpensePolicy();
  const removeAssignment = useRemoveExpensePolicyAssignment();

  const { data: empData } = useEmployeeList();
  const { data: departments } = useDepartmentList();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMonthly, setEditMonthly] = useState('');
  const [editReceipt, setEditReceipt] = useState('');
  const [editAutoApprove, setEditAutoApprove] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignType, setAssignType] = useState<'employee' | 'department'>('employee');
  const [assignId, setAssignId] = useState('');

  const startEdit = useCallback(() => {
    if (!policy) return;
    setEditName(policy.name);
    setEditMonthly(policy.monthlyLimit != null ? String(policy.monthlyLimit) : '');
    setEditReceipt(policy.requireReceiptAbove != null ? String(policy.requireReceiptAbove) : '');
    setEditAutoApprove(policy.autoApproveBelow != null ? String(policy.autoApproveBelow) : '');
    setIsEditing(true);
  }, [policy]);

  const handleSave = () => {
    if (!editName.trim()) return;
    updatePolicy.mutate({
      id: policyId,
      name: editName.trim(),
      monthlyLimit: editMonthly ? Number(editMonthly) : null,
      requireReceiptAbove: editReceipt ? Number(editReceipt) : null,
      autoApproveBelow: editAutoApprove ? Number(editAutoApprove) : null,
    }, {
      onSuccess: () => setIsEditing(false),
    });
  };

  const handleDelete = () => {
    deletePolicy.mutate(policyId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onDelete();
      },
    });
  };

  const handleAssign = () => {
    if (!assignId) return;
    const input = assignType === 'employee'
      ? { id: policyId, employeeId: assignId }
      : { id: policyId, departmentId: assignId };
    assignPolicy.mutate(input, {
      onSuccess: () => {
        setShowAssignModal(false);
        setAssignId('');
      },
    });
  };

  if (isLoading || !policy) {
    return <Skeleton height={200} />;
  }

  const employees = empData?.employees ?? [];
  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));
  const departmentOptions = (departments?.departments ?? []).map((d) => ({ value: d.id, label: d.name }));

  return (
    <>
      <div style={{
        padding: 'var(--spacing-lg)',
        border: '1px solid var(--color-border-secondary)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-bg-primary)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-lg)',
        }}>
          {isEditing ? (
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} size="sm" autoFocus style={{ maxWidth: 300 }} />
          ) : (
            <span style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
            }}>
              {policy.name}
            </span>
          )}

          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
            {!isEditing ? (
              <>
                <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={startEdit} aria-label={t('common.edit')} />
                <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setShowDeleteConfirm(true)} aria-label={t('common.delete')} />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => setIsEditing(false)} aria-label={t('common.cancel')} />
                <Button variant="primary" size="sm" icon={<Check size={14} />} onClick={handleSave} disabled={!editName.trim() || updatePolicy.isPending}>
                  {t('common.save')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Settings */}
        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
            <Input label={t('hr.expenses.policies.monthlyLimit')} type="number" value={editMonthly} onChange={(e) => setEditMonthly(e.target.value)} placeholder={t('hr.expenses.policies.noLimit')} />
            <Input label={t('hr.expenses.policies.receiptAbove')} type="number" value={editReceipt} onChange={(e) => setEditReceipt(e.target.value)} placeholder={t('hr.expenses.policies.noThreshold')} />
            <Input label={t('hr.expenses.policies.autoApprove')} type="number" value={editAutoApprove} onChange={(e) => setEditAutoApprove(e.target.value)} placeholder={t('hr.expenses.policies.noThreshold')} />
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-lg)',
          }}>
            <SettingItem label={t('hr.expenses.policies.monthlyLimit')} value={policy.monthlyLimit != null ? formatCurrency(policy.monthlyLimit) : '\u2014'} />
            <SettingItem label={t('hr.expenses.policies.receiptAbove')} value={policy.requireReceiptAbove != null ? formatCurrency(policy.requireReceiptAbove) : '\u2014'} />
            <SettingItem label={t('hr.expenses.policies.autoApprove')} value={policy.autoApproveBelow != null ? formatCurrency(policy.autoApproveBelow) : '\u2014'} />
          </div>
        )}

        {/* Assignments */}
        <div style={{
          borderTop: '1px solid var(--color-border-secondary)',
          paddingTop: 'var(--spacing-lg)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-md)',
          }}>
            <span style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-family)',
            }}>
              {t('hr.expenses.policies.assignments')}
            </span>
            <Button variant="secondary" size="sm" icon={<UserPlus size={14} />} onClick={() => setShowAssignModal(true)}>
              {t('hr.expenses.policies.assign')}
            </Button>
          </div>

          {(!policy.assignments || policy.assignments.length === 0) ? (
            <div style={{
              padding: 'var(--spacing-lg)',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
            }}>
              {t('hr.expenses.policies.noAssignments')}
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}>
              {policy.assignments.map((a, idx) => (
                <div
                  key={a.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderBottom: idx < policy.assignments.length - 1 ? '1px solid var(--color-border-secondary)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Badge variant={a.employeeId ? 'default' : 'primary'}>
                      {a.employeeId ? t('hr.expenses.policies.employee') : t('hr.expenses.policies.department')}
                    </Badge>
                    <span style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-primary)',
                      fontFamily: 'var(--font-family)',
                    }}>
                      {a.employeeName || a.departmentName || '\u2014'}
                    </span>
                  </div>
                  <IconButton
                    icon={<XIcon size={14} />}
                    label={t('common.remove')}
                    size={24}
                    destructive
                    onClick={() => removeAssignment.mutate({ id: policyId, assignmentId: a.id })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('hr.expenses.policies.deleteTitle')}
        description={t('hr.expenses.policies.deleteDesc', { name: policy.name })}
        confirmLabel={t('common.delete')}
        onConfirm={handleDelete}
        destructive
      />

      {/* Assign modal */}
      {showAssignModal && (
        <Modal open={showAssignModal} onOpenChange={(v) => { if (!v) { setShowAssignModal(false); setAssignId(''); } }}>
          <Modal.Header title={t('hr.expenses.policies.assign')} />
          <Modal.Body>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <Select
                value={assignType}
                onChange={(v) => { setAssignType(v as 'employee' | 'department'); setAssignId(''); }}
                options={[
                  { value: 'employee', label: t('hr.expenses.policies.employee') },
                  { value: 'department', label: t('hr.expenses.policies.department') },
                ]}
              />
              <Select
                value={assignId}
                onChange={setAssignId}
                options={[
                  { value: '', label: t('hr.expenses.policies.selectAssignee') },
                  ...(assignType === 'employee' ? employeeOptions : departmentOptions),
                ]}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" size="sm" onClick={() => { setShowAssignModal(false); setAssignId(''); }}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleAssign} disabled={!assignId || assignPolicy.isPending}>
              {t('hr.expenses.policies.assign')}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}

// ─── Setting Item ───────────────────────────────────────────────

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: 'var(--font-size-xs)',
        color: 'var(--color-text-tertiary)',
        fontFamily: 'var(--font-family)',
        marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-medium)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
      }}>
        {value}
      </div>
    </div>
  );
}

// ─── Create Policy Modal ────────────────────────────────────────

function CreatePolicyModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const createPolicy = useCreateExpensePolicy();
  const [name, setName] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [receiptAbove, setReceiptAbove] = useState('');
  const [autoApprove, setAutoApprove] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    createPolicy.mutate({
      name: name.trim(),
      monthlyLimit: monthlyLimit ? Number(monthlyLimit) : null,
      requireReceiptAbove: receiptAbove ? Number(receiptAbove) : null,
      autoApproveBelow: autoApprove ? Number(autoApprove) : null,
    }, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Modal open onOpenChange={(v) => { if (!v) onClose(); }}>
      <Modal.Header title={t('hr.expenses.policies.add')} />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label={t('hr.fields.name')} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('hr.expenses.policies.namePlaceholder')} autoFocus />
          <Input label={t('hr.expenses.policies.monthlyLimit')} type="number" value={monthlyLimit} onChange={(e) => setMonthlyLimit(e.target.value)} placeholder={t('hr.expenses.policies.noLimit')} />
          <Input label={t('hr.expenses.policies.receiptAbove')} type="number" value={receiptAbove} onChange={(e) => setReceiptAbove(e.target.value)} placeholder={t('hr.expenses.policies.noThreshold')} />
          <Input label={t('hr.expenses.policies.autoApprove')} type="number" value={autoApprove} onChange={(e) => setAutoApprove(e.target.value)} placeholder={t('hr.expenses.policies.noThreshold')} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" size="sm" onClick={handleCreate} disabled={!name.trim() || createPolicy.isPending}>{t('common.save')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
