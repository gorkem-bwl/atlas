import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase, Building2, Users, Plus, Mail, Phone as PhoneIcon, User, TrendingUp,
} from 'lucide-react';
import {
  useUpdateContact,
  type CrmContact, type CrmCompany,
} from '../../hooks';
import type { EditingCell, SortState } from '../../lib/crm-helpers';
import { NameAvatar, CompanyLogo } from '../../lib/crm-helpers';
import { InlineEditInput } from '../inline-edit-cells';
import { DataTable, type DataTableColumn } from '../../../../components/ui/data-table';
import { FeatureEmptyState } from '../../../../components/ui/feature-empty-state';

export function ContactsListView({
  contacts, selectedId, onSelect,
  selectedIds, onSelectionChange, focusedIndex, onFocusedIndexChange,
  editingCell, onEditingCellChange, sort, onSortChange,
  companies, onAdd, canEdit = true, groupBy = null,
}: {
  contacts: CrmContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  focusedIndex: number | null;
  onFocusedIndexChange: (idx: number | null) => void;
  editingCell: EditingCell | null;
  onEditingCellChange: (cell: EditingCell | null) => void;
  sort: SortState | null;
  onSortChange: (sort: SortState | null) => void;
  companies: CrmCompany[];
  onAdd: () => void;
  groupBy?: string | null;
  canEdit?: boolean;
}) {
  const { t } = useTranslation();
  const updateContact = useUpdateContact();

  const companyDomainMap = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((c) => { if (c.domain) map.set(c.id, c.domain); });
    return map;
  }, [companies]);

  const handleCellClick = (rowId: string, column: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    onEditingCellChange({ rowId, column });
  };

  const handleSave = (contactId: string, column: string, value: string) => {
    const updates: Record<string, unknown> = { id: contactId };
    switch (column) {
      case 'name': updates.name = value; break;
      case 'email': updates.email = value || null; break;
      case 'phone': updates.phone = value || null; break;
      case 'position': updates.position = value || null; break;
    }
    updateContact.mutate(updates as Parameters<typeof updateContact.mutate>[0]);
    onEditingCellChange(null);
  };

  if (contacts.length === 0) {
    return (
      <FeatureEmptyState
        illustration="contacts"
        title={t('crm.empty.contactsTitle')}
        description={t('crm.empty.contactsDesc')}
        highlights={[
          { icon: <Users size={14} />, title: t('crm.empty.contactsH1Title'), description: t('crm.empty.contactsH1Desc') },
          { icon: <Mail size={14} />, title: t('crm.empty.contactsH2Title'), description: t('crm.empty.contactsH2Desc') },
          { icon: <TrendingUp size={14} />, title: t('crm.empty.contactsH3Title'), description: t('crm.empty.contactsH3Desc') },
        ]}
        actionLabel={canEdit ? t('crm.empty.addContact') : undefined}
        actionIcon={canEdit ? <Plus size={14} /> : undefined}
        onAction={canEdit ? onAdd : undefined}
      />
    );
  }

  const isEd = (cId: string, col: string) => editingCell?.rowId === cId && editingCell?.column === col;

  const contactColumns: DataTableColumn<CrmContact>[] = [
    {
      key: 'name', label: t('crm.contacts.name'), icon: <User size={12} />, width: 160, sortable: true,
      searchValue: (c) => c.name ?? '',
      render: (c) => isEd(c.id, 'name') ? (
        <InlineEditInput value={c.name} type="text" onSave={(v) => handleSave(c.id, 'name', v)} onCancel={() => onEditingCellChange(null)} />
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', cursor: 'text' }} onClick={(e) => handleCellClick(c.id, 'name', e)}>
          <NameAvatar name={c.name} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
        </span>
      ),
    },
    {
      key: 'email', label: t('crm.contacts.email'), icon: <Mail size={12} />, width: 170, sortable: true,
      searchValue: (c) => c.email ?? '',
      render: (c) => isEd(c.id, 'email') ? (
        <InlineEditInput value={c.email || ''} type="text" onSave={(v) => handleSave(c.id, 'email', v)} onCancel={() => onEditingCellChange(null)} />
      ) : (
        <span className="dt-cell-secondary" style={{ cursor: 'text' }} onClick={(e) => handleCellClick(c.id, 'email', e)}>{c.email || '-'}</span>
      ),
    },
    {
      key: 'phone', label: t('crm.contacts.phone'), icon: <PhoneIcon size={12} />, width: 120, sortable: true,
      searchValue: (c) => c.phone ?? '',
      render: (c) => isEd(c.id, 'phone') ? (
        <InlineEditInput value={c.phone || ''} type="text" onSave={(v) => handleSave(c.id, 'phone', v)} onCancel={() => onEditingCellChange(null)} />
      ) : (
        <span className="dt-cell-secondary" style={{ cursor: 'text' }} onClick={(e) => handleCellClick(c.id, 'phone', e)}>{c.phone || '-'}</span>
      ),
    },
    {
      key: 'company', label: t('crm.deals.company'), icon: <Building2 size={12} />, width: 130, sortable: true,
      searchValue: (c) => c.companyName ?? '',
      render: (c) => (
        <span className="dt-cell-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {c.companyId && <CompanyLogo domain={companyDomainMap.get(c.companyId)} />}
          {c.companyName || '-'}
        </span>
      ),
      compare: (a, b) => (a.companyName || '').localeCompare(b.companyName || ''),
    },
    {
      key: 'position', label: t('crm.contacts.position'), icon: <Briefcase size={12} />, width: 130, sortable: true,
      searchValue: (c) => c.position ?? '',
      render: (c) => isEd(c.id, 'position') ? (
        <InlineEditInput value={c.position || ''} type="text" onSave={(v) => handleSave(c.id, 'position', v)} onCancel={() => onEditingCellChange(null)} />
      ) : (
        <span className="dt-cell-secondary" style={{ cursor: 'text' }} onClick={(e) => handleCellClick(c.id, 'position', e)}>{c.position || '-'}</span>
      ),
    },
  ];

  return (
    <DataTable
      persistSortKey="crm_contacts"
      data={contacts}
      columns={contactColumns}
      selectable
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      sort={sort}
      onSortChange={onSortChange}
      activeRowId={selectedId}
      onRowClick={(c) => { if (!editingCell) onSelect(c.id); }}
      onAddRow={canEdit ? onAdd : undefined}
      addRowLabel={t('crm.actions.addNew')}
      emptyTitle={t('crm.empty.noMatchingContacts')}
      searchable
      exportable
      columnSelector
      resizableColumns
      storageKey="crm-contacts"
    />
  );
}
