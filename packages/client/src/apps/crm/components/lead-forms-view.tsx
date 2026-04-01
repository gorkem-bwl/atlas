import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Copy, Trash2, Check, Globe, ToggleLeft, ToggleRight, FileText } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import { Badge } from '../../../components/ui/badge';
import { IconButton } from '../../../components/ui/icon-button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';
import { useToastStore } from '../../../stores/toast-store';
import {
  useLeadForms, useCreateLeadForm, useUpdateLeadForm, useDeleteLeadForm,
  type CrmLeadForm,
} from '../hooks';

// ─── Helpers ─────────────────────────────────────────────────────────

function getServerUrl(): string {
  // Use the server URL from env or infer from current location
  return import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`;
}

function generateEmbedCode(form: CrmLeadForm): string {
  const serverUrl = getServerUrl();
  const url = `${serverUrl}/crm/forms/public/${form.token}`;

  const fieldInputs = form.fields.map((field) => {
    switch (field) {
      case 'name':
        return '  <input name="name" placeholder="Name" required />';
      case 'email':
        return '  <input name="email" type="email" placeholder="Email" required />';
      case 'phone':
        return '  <input name="phone" placeholder="Phone" />';
      case 'companyName':
        return '  <input name="companyName" placeholder="Company" />';
      case 'message':
        return '  <textarea name="message" placeholder="Message"></textarea>';
      default:
        return `  <input name="${field}" placeholder="${field}" />`;
    }
  });

  return `<form action="${url}" method="POST">\n${fieldInputs.join('\n')}\n  <button type="submit">Submit</button>\n</form>`;
}

// ─── LeadFormsView component ─────────────────────────────────────────

export function LeadFormsView() {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { data: formsData, isLoading } = useLeadForms();
  const createForm = useCreateLeadForm();
  const updateForm = useUpdateLeadForm();
  const deleteForm = useDeleteLeadForm();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState<CrmLeadForm | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const forms = formsData?.forms ?? [];

  const handleCreate = useCallback(() => {
    if (!formName.trim()) return;
    createForm.mutate({ name: formName.trim() });
    setFormName('');
    setShowCreateModal(false);
  }, [formName, createForm]);

  const handleToggleActive = useCallback((form: CrmLeadForm) => {
    updateForm.mutate({ id: form.id, isActive: !form.isActive });
  }, [updateForm]);

  const handleDelete = useCallback((id: string) => {
    deleteForm.mutate(id);
    setDeleteConfirm(null);
  }, [deleteForm]);

  const handleCopyEmbed = useCallback(async (form: CrmLeadForm) => {
    const code = generateEmbedCode(form);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      addToast({ message: t('crm.leadForms.codeCopied'), type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      addToast({ message: t('crm.leadForms.codeCopied'), type: 'success' });
      setTimeout(() => setCopied(false), 2000);
    }
  }, [addToast, t]);

  const handleShowEmbed = useCallback((form: CrmLeadForm) => {
    setSelectedForm(form);
    setShowEmbedModal(true);
    setCopied(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)' }}>
        {t('common.loading')}...
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-xl)', overflow: 'auto', flex: 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h2 style={{
            fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-family)',
            margin: 0,
          }}>
            {t('crm.leadForms.title')}
          </h2>
          <p style={{
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-family)', margin: '4px 0 0 0',
          }}>
            {t('crm.leadForms.subtitle')}
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreateModal(true)}>
          {t('crm.leadForms.createForm')}
        </Button>
      </div>

      {/* Forms list */}
      {forms.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--spacing-2xl)',
          color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family)',
        }}>
          <Globe size={40} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.4 }} />
          <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)' }}>
            {t('crm.leadForms.noForms')}
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)' }}>
            {t('crm.leadForms.noFormsDesc')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {forms.map((form) => (
            <div
              key={form.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: '1px solid var(--color-border-secondary)',
                borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-primary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              <FileText size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />

              {/* Name & info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {form.name}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {t('crm.leadForms.submissions', { count: form.submitCount })}
                </div>
              </div>

              {/* Status badge */}
              <Badge variant={form.isActive ? 'success' : 'default'}>
                {form.isActive ? t('crm.leadForms.active') : t('crm.leadForms.inactive')}
              </Badge>

              {/* Toggle active */}
              <IconButton
                icon={form.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                label={form.isActive ? t('crm.leadForms.deactivate') : t('crm.leadForms.activate')}
                size={28}
                onClick={() => handleToggleActive(form)}
                style={{ color: form.isActive ? 'var(--color-success)' : 'var(--color-text-tertiary)' }}
              />

              {/* Copy embed code */}
              <Button variant="ghost" size="sm" icon={<Copy size={13} />} onClick={() => handleShowEmbed(form)}>
                {t('crm.leadForms.embedCode')}
              </Button>

              {/* Delete */}
              <IconButton
                icon={<Trash2 size={14} />}
                label={t('common.delete')}
                size={28}
                destructive
                onClick={() => setDeleteConfirm(form.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create form modal */}
      <Modal open={showCreateModal} onOpenChange={setShowCreateModal} width={400} title={t('crm.leadForms.createForm')}>
        <Modal.Header title={t('crm.leadForms.createForm')} />
        <Modal.Body>
          <Input
            label={t('crm.leadForms.formName')}
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder={t('crm.leadForms.formNamePlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => { setShowCreateModal(false); setFormName(''); }}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleCreate} disabled={!formName.trim()}>{t('crm.leadForms.create')}</Button>
        </Modal.Footer>
      </Modal>

      {/* Embed code modal */}
      <Modal open={showEmbedModal} onOpenChange={setShowEmbedModal} width={560} title={t('crm.leadForms.embedCode')}>
        <Modal.Header title={t('crm.leadForms.embedCode')} />
        <Modal.Body>
          {selectedForm && (
            <div>
              <p style={{
                fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-family)', marginBottom: 'var(--spacing-md)', marginTop: 0,
              }}>
                {t('crm.leadForms.embedInstructions')}
              </p>
              <pre style={{
                background: 'var(--color-bg-tertiary)', padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)',
                fontFamily: 'monospace', overflow: 'auto', maxHeight: 300,
                color: 'var(--color-text-primary)', border: '1px solid var(--color-border-secondary)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
              }}>
                {generateEmbedCode(selectedForm)}
              </pre>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setShowEmbedModal(false)}>{t('common.close')}</Button>
          <Button
            variant="primary"
            icon={copied ? <Check size={14} /> : <Copy size={14} />}
            onClick={() => selectedForm && handleCopyEmbed(selectedForm)}
          >
            {copied ? t('crm.leadForms.copied') : t('crm.leadForms.copyCode')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title={t('crm.leadForms.deleteForm')}
        description={t('crm.leadForms.deleteFormDesc')}
        confirmLabel={t('common.delete')}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
      />
    </div>
  );
}
