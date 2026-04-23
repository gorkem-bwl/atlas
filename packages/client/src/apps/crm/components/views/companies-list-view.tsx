import { useTranslation } from 'react-i18next';
import {
  Building2, Users, Plus, Globe, Tag,
} from 'lucide-react';
import {
  useUpdateCompany,
  type CrmCompany,
} from '../../hooks';
import type { EditingCell, SortState } from '../../lib/crm-helpers';
import { CompanyLogo } from '../../lib/crm-helpers';
import { InlineEditInput } from '../inline-edit-cells';
import { Chip } from '../../../../components/ui/chip';
import { DataTable, type DataTableColumn } from '../../../../components/ui/data-table';
import { FeatureEmptyState } from '../../../../components/ui/feature-empty-state';

export function CompaniesListView({
  companies, selectedId, onSelect,
  selectedIds, onSelectionChange, focusedIndex, onFocusedIndexChange,
  editingCell, onEditingCellChange, sort, onSortChange,
  onAdd, canEdit = true, groupBy = null,
}: {
  companies: CrmCompany[];
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
  onAdd: () => void;
  canEdit?: boolean;
  groupBy?: string | null;
}) {
  const { t } = useTranslation();
  const updateCompany = useUpdateCompany();

  const handleCellClick = (rowId: string, column: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;
    onEditingCellChange({ rowId, column });
  };

  const handleSave = (companyId: string, column: string, value: string) => {
    const updates: Record<string, unknown> = { id: companyId };
    switch (column) {
      case 'name': updates.name = value; break;
      case 'domain': updates.domain = value || null; break;
      case 'industry': updates.industry = value || null; break;
    }
    updateCompany.mutate(updates as Parameters<typeof updateCompany.mutate>[0]);
    onEditingCellChange(null);
  };

  if (companies.length === 0) {
    return (
      <FeatureEmptyState
        illustration="contacts"
        title={t('crm.empty.companiesTitle')}
        description={t('crm.empty.companiesDesc')}
        highlights={[
          { icon: <Building2 size={14} />, title: t('crm.empty.companiesH1Title'), description: t('crm.empty.companiesH1Desc') },
          { icon: <Globe size={14} />, title: t('crm.empty.companiesH2Title'), description: t('crm.empty.companiesH2Desc') },
          { icon: <Users size={14} />, title: t('crm.empty.companiesH3Title'), description: t('crm.empty.companiesH3Desc') },
        ]}
        actionLabel={canEdit ? t('crm.empty.addCompany') : undefined}
        actionIcon={canEdit ? <Plus size={14} /> : undefined}
        onAction={canEdit ? onAdd : undefined}
      />
    );
  }

  const isEd = (cId: string, col: string) => editingCell?.rowId === cId && editingCell?.column === col;

  const companyColumns: DataTableColumn<CrmCompany>[] = [
    {
      key: 'name', label: t('crm.companies.name'), icon: <Building2 size={12} />, width: 160, sortable: true,
      searchValue: (c) => c.name,
      render: (c) => isEd(c.id, 'name') ? (
        <InlineEditInput value={c.name} type="text" onSave={(v) => handleSave(c.id, 'name', v)} onCancel={() => onEditingCellChange(null)} />
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-sm)', cursor: 'text' }} onClick={(e) => handleCellClick(c.id, 'name', e)}>
          <CompanyLogo domain={c.domain} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
        </span>
      ),
    },
    {
      key: 'domain', label: t('crm.companies.domain'), icon: <Globe size={12} />, width: 150, sortable: true,
      searchValue: (c) => c.domain || '',
      render: (c) => isEd(c.id, 'domain') ? (
        <InlineEditInput value={c.domain || ''} type="text" onSave={(v) => handleSave(c.id, 'domain', v)} onCancel={() => onEditingCellChange(null)} />
      ) : (
        <span className="dt-cell-secondary" style={{ cursor: 'text' }} onClick={(e) => handleCellClick(c.id, 'domain', e)}>{c.domain || '-'}</span>
      ),
    },
    {
      key: 'industry', label: t('crm.companies.industry'), icon: <Tag size={12} />, width: 120, sortable: true,
      searchValue: (c) => c.industry || '',
      render: (c) => isEd(c.id, 'industry') ? (
        <InlineEditInput value={c.industry || ''} type="text" onSave={(v) => handleSave(c.id, 'industry', v)} onCancel={() => onEditingCellChange(null)} />
      ) : (
        <span style={{ cursor: 'text' }} onClick={(e) => handleCellClick(c.id, 'industry', e)}>
          {c.industry ? <Chip>{c.industry}</Chip> : <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>-</span>}
        </span>
      ),
    },
    {
      key: 'size', label: t('crm.companies.size'), icon: <Users size={12} />, width: 80, sortable: true,
      searchValue: (c) => c.size || '',
      render: (c) => <span className="dt-cell-secondary">{c.size || '-'}</span>,
    },
    {
      key: 'stats', label: t('crm.companies.contactsDeals'),
      searchValue: (c) => `${c.contactCount} ${c.dealCount}`,
      render: (c) => (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {c.contactCount} {t('crm.sidebar.contacts').toLowerCase()} &middot; {c.dealCount} {t('crm.sidebar.deals').toLowerCase()}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      persistSortKey="crm_companies"
      data={companies}
      columns={companyColumns}
      searchable
      exportable
      columnSelector
      resizableColumns
      storageKey="crm-companies"
      selectable
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      sort={sort}
      onSortChange={onSortChange}
      activeRowId={selectedId}
      onRowClick={(c) => { if (!editingCell) onSelect(c.id); }}
      onAddRow={canEdit ? onAdd : undefined}
      addRowLabel={t('crm.actions.addNew')}
      emptyTitle={t('crm.empty.noMatchingCompanies')}
    />
  );
}
