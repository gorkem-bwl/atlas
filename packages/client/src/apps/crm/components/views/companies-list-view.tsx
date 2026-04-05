import { useMemo } from 'react';
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
  companies, selectedId, onSelect, searchQuery,
  selectedIds, onSelectionChange, focusedIndex, onFocusedIndexChange,
  editingCell, onEditingCellChange, sort, onSortChange,
  onAdd, canEdit = true, groupBy = null,
}: {
  companies: CrmCompany[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
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

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.domain?.toLowerCase().includes(q)) ||
      (c.industry?.toLowerCase().includes(q)),
    );
  }, [companies, searchQuery]);

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

  if (filtered.length === 0) {
    if (searchQuery) {
      return (
        <div className="crm-empty-state">
          <Building2 size={48} className="crm-empty-state-icon" />
          <div className="crm-empty-state-title">{t('crm.empty.noMatchingCompanies')}</div>
          <div className="crm-empty-state-desc">{t('crm.empty.tryDifferentSearch')}</div>
        </div>
      );
    }
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
        actionLabel={t('crm.empty.addCompany')}
        actionIcon={<Plus size={14} />}
        onAction={onAdd}
      />
    );
  }

  const isEd = (cId: string, col: string) => editingCell?.rowId === cId && editingCell?.column === col;

  const companyColumns: DataTableColumn<CrmCompany>[] = [
    {
      key: 'name', label: t('crm.companies.name'), icon: <Building2 size={12} />, width: 160, sortable: true,
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
      render: (c) => isEd(c.id, 'domain') ? (
        <InlineEditInput value={c.domain || ''} type="text" onSave={(v) => handleSave(c.id, 'domain', v)} onCancel={() => onEditingCellChange(null)} />
      ) : (
        <span className="dt-cell-secondary" style={{ cursor: 'text' }} onClick={(e) => handleCellClick(c.id, 'domain', e)}>{c.domain || '-'}</span>
      ),
    },
    {
      key: 'industry', label: t('crm.companies.industry'), icon: <Tag size={12} />, width: 120, sortable: true,
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
      render: (c) => <span className="dt-cell-secondary">{c.size || '-'}</span>,
    },
    {
      key: 'stats', label: t('crm.companies.contactsDeals'),
      render: (c) => (
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
          {c.contactCount} {t('crm.sidebar.contacts').toLowerCase()} &middot; {c.dealCount} {t('crm.sidebar.deals').toLowerCase()}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={filtered}
      columns={companyColumns}
      selectable
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      sort={sort}
      onSortChange={onSortChange}
      activeRowId={selectedId}
      onRowClick={(c) => { if (!editingCell) onSelect(c.id); }}
      onAddRow={onAdd}
      addRowLabel={t('crm.actions.addNew')}
      emptyTitle={t('crm.empty.noMatchingCompanies')}
    />
  );
}
