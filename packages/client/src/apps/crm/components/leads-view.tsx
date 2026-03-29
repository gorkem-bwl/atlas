import { useState } from 'react';
import { UserPlus, Search, ChevronRight, Trash2, ArrowRightLeft } from 'lucide-react';
import {
  useLeads, useCreateLead, useUpdateLead, useDeleteLead, useConvertLead, useStages,
  type CrmLead, type CrmLeadStatus, type CrmLeadSource,
} from '../hooks';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Modal } from '../../../components/ui/modal';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { IconButton } from '../../../components/ui/icon-button';
import { ConfirmDialog } from '../../../components/ui/confirm-dialog';

const STATUS_OPTIONS: { value: CrmLeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const SOURCE_OPTIONS: { value: CrmLeadSource; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold call' },
  { value: 'social_media', label: 'Social media' },
  { value: 'event', label: 'Event' },
  { value: 'other', label: 'Other' },
];

function statusBadgeVariant(status: CrmLeadStatus): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'new': return 'default';
    case 'contacted': return 'primary';
    case 'qualified': return 'warning';
    case 'converted': return 'success';
    case 'lost': return 'error';
  }
}

function sourceBadgeVariant(_source: CrmLeadSource): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  return 'default';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Create lead modal ──────────────────────────────────────────

function CreateLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createLead = useCreateLead();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [source, setSource] = useState<CrmLeadSource>('other');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    createLead.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      companyName: companyName.trim() || undefined,
      source,
      notes: notes.trim() || undefined,
    }, {
      onSuccess: () => {
        onClose();
        setName(''); setEmail(''); setPhone(''); setCompanyName(''); setSource('other'); setNotes('');
      },
    });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <Modal.Header title="New lead" />
      <Modal.Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} size="md" />
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} size="md" />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} size="md" />
          <Input label="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} size="md" />
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Source</div>
            <Select value={source} onChange={(v) => setSource(v as CrmLeadSource)} options={SOURCE_OPTIONS} size="md" />
          </div>
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} size="md">Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} size="md" disabled={!name.trim() || createLead.isPending}>
          {createLead.isPending ? 'Creating...' : 'Create lead'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Convert lead modal ─────────────────────────────────────────

function ConvertLeadModal({
  open, onClose, lead,
}: { open: boolean; onClose: () => void; lead: CrmLead | null }) {
  const convertLead = useConvertLead();
  const { data: stagesData } = useStages();
  const stages = stagesData?.stages ?? [];
  const [dealTitle, setDealTitle] = useState('');
  const [dealStageId, setDealStageId] = useState('');
  const [dealValue, setDealValue] = useState('0');

  const defaultStage = stages.find((s) => s.isDefault) ?? stages[0];

  const handleSubmit = () => {
    if (!lead || !dealTitle.trim()) return;
    const stageId = dealStageId || defaultStage?.id;
    if (!stageId) return;

    convertLead.mutate({
      leadId: lead.id,
      dealTitle: dealTitle.trim(),
      dealStageId: stageId,
      dealValue: Number(dealValue) || 0,
    }, { onSuccess: () => { onClose(); } });
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <Modal.Header title="Convert lead to deal" />
      <Modal.Body>
        {lead && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
              <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: 4 }}>This will create:</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Contact: {lead.name} {lead.email ? `(${lead.email})` : ''}</li>
                {lead.companyName && <li>Company: {lead.companyName}</li>}
                <li>Deal (details below)</li>
              </ul>
            </div>
            <Input label="Deal title" value={dealTitle} onChange={(e) => setDealTitle(e.target.value)} size="md" />
            <div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Stage</div>
              <Select
                value={dealStageId || defaultStage?.id || ''}
                onChange={(v) => setDealStageId(v)}
                options={stages.map((s) => ({ value: s.id, label: s.name }))}
                size="md"
              />
            </div>
            <Input label="Value" type="number" value={dealValue} onChange={(e) => setDealValue(e.target.value)} size="md" />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} size="md">Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} size="md" disabled={!dealTitle.trim() || convertLead.isPending}>
          {convertLead.isPending ? 'Converting...' : 'Convert'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// ─── Lead detail panel ──────────────────────────────────────────

function LeadDetailPanel({
  lead, onClose, onConvert,
}: { lead: CrmLead; onClose: () => void; onConvert: () => void }) {
  const updateLead = useUpdateLead();

  return (
    <div className="crm-detail-panel">
      <div className="crm-detail-panel-header">
        <span className="crm-detail-panel-title">{lead.name}</span>
        <IconButton icon={<ChevronRight size={14} />} label="Close" onClick={onClose} />
      </div>
      <div className="crm-detail-panel-body">
        <div className="crm-detail-field">
          <span className="crm-detail-label">Status</span>
          <Select
            value={lead.status}
            onChange={(v) => updateLead.mutate({ id: lead.id, status: v })}
            options={STATUS_OPTIONS}
            size="sm"
          />
        </div>
        {lead.email && (
          <div className="crm-detail-field">
            <span className="crm-detail-label">Email</span>
            <span className="crm-detail-value">{lead.email}</span>
          </div>
        )}
        {lead.phone && (
          <div className="crm-detail-field">
            <span className="crm-detail-label">Phone</span>
            <span className="crm-detail-value">{lead.phone}</span>
          </div>
        )}
        {lead.companyName && (
          <div className="crm-detail-field">
            <span className="crm-detail-label">Company</span>
            <span className="crm-detail-value">{lead.companyName}</span>
          </div>
        )}
        <div className="crm-detail-field">
          <span className="crm-detail-label">Source</span>
          <Badge variant={sourceBadgeVariant(lead.source)}>{lead.source.replace('_', ' ')}</Badge>
        </div>
        {lead.notes && (
          <div className="crm-detail-field">
            <span className="crm-detail-label">Notes</span>
            <span className="crm-detail-value" style={{ whiteSpace: 'pre-wrap' }}>{lead.notes}</span>
          </div>
        )}
        <div className="crm-detail-field">
          <span className="crm-detail-label">Created</span>
          <span className="crm-detail-value">{formatDate(lead.createdAt)}</span>
        </div>

        {lead.status !== 'converted' && (
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <Button variant="primary" onClick={onConvert} size="md" style={{ width: '100%' }}>
              <ArrowRightLeft size={14} style={{ marginRight: 6 }} />
              Convert to deal
            </Button>
          </div>
        )}
        {lead.status === 'converted' && (
          <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            This lead has been converted.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main leads view ────────────────────────────────────────────

export function LeadsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const { data: leadsData, isLoading } = useLeads({
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    source: sourceFilter || undefined,
  });
  const leads = leadsData?.leads ?? [];
  const deleteLead = useDeleteLead();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [convertingLead, setConvertingLead] = useState<CrmLead | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedLead = selectedLeadId ? leads.find((l) => l.id === selectedLeadId) ?? null : null;

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div className="crm-content-header">
          <span className="crm-content-header-title">Leads</span>
          <div className="crm-content-header-actions">
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              <Input
                iconLeft={<Search size={14} />}
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
                style={{ width: 200 }}
              />
              <Select
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
                size="sm"
                width={140}
              />
              <Select
                value={sourceFilter}
                onChange={(v) => setSourceFilter(v)}
                options={[{ value: '', label: 'All sources' }, ...SOURCE_OPTIONS]}
                size="sm"
                width={140}
              />
              <Button variant="primary" onClick={() => setShowCreateModal(true)} size="sm">
                <UserPlus size={14} style={{ marginRight: 4 }} />
                New lead
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
          {isLoading ? (
            <div style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 40 }}>Loading...</div>
          ) : leads.length === 0 ? (
            <div style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 40 }}>
              No leads yet. Click "New lead" to create one.
            </div>
          ) : (
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ width: 60 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={selectedLeadId === lead.id ? 'crm-row-selected' : ''}
                    onClick={() => setSelectedLeadId(lead.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="crm-cell-primary">{lead.name}</td>
                    <td>{lead.email || '--'}</td>
                    <td>{lead.companyName || '--'}</td>
                    <td><Badge variant={sourceBadgeVariant(lead.source)}>{lead.source.replace('_', ' ')}</Badge></td>
                    <td><Badge variant={statusBadgeVariant(lead.status)}>{lead.status}</Badge></td>
                    <td>{formatDate(lead.createdAt)}</td>
                    <td>
                      <IconButton
                        icon={<Trash2 size={13} />}
                        label="Delete"
                        destructive
                        onClick={(e) => { e.stopPropagation(); setDeletingId(lead.id); }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onConvert={() => setConvertingLead(selectedLead)}
        />
      )}

      {/* Modals */}
      <CreateLeadModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
      <ConvertLeadModal open={!!convertingLead} onClose={() => setConvertingLead(null)} lead={convertingLead} />
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null); }}
        title="Delete lead"
        description="Are you sure you want to delete this lead?"
        onConfirm={() => { if (deletingId) { deleteLead.mutate(deletingId); setDeletingId(null); if (selectedLeadId === deletingId) setSelectedLeadId(null); } }}
        destructive
      />
    </div>
  );
}
