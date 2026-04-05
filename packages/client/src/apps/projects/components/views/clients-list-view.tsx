import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../../../lib/format';
import {
  FolderKanban, Users, FileText, Plus, DollarSign, Mail,
} from 'lucide-react';
import { type ProjectClient } from '../../hooks';
import { DataTable, type DataTableColumn } from '../../../../components/ui/data-table';
import { FeatureEmptyState } from '../../../../components/ui/feature-empty-state';

export function ClientsListView({ clients, searchQuery, onSelect, selectedId, onAdd }: {
  clients: ProjectClient[];
  searchQuery: string;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onAdd: () => void;
}) {
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q) || (c.email?.toLowerCase().includes(q)));
  }, [clients, searchQuery]);

  if (filtered.length === 0 && !searchQuery) {
    return (
      <FeatureEmptyState
        illustration="contacts"
        title={t('projects.empty.clientsTitle')}
        description={t('projects.empty.clientsDesc')}
        highlights={[
          { icon: <Users size={14} />, title: t('projects.empty.clientsH1Title'), description: t('projects.empty.clientsH1Desc') },
          { icon: <FileText size={14} />, title: t('projects.empty.clientsH2Title'), description: t('projects.empty.clientsH2Desc') },
          { icon: <DollarSign size={14} />, title: t('projects.empty.clientsH3Title'), description: t('projects.empty.clientsH3Desc') },
        ]}
        actionLabel={t('projects.clients.addClient')}
        actionIcon={<Plus size={14} />}
        onAction={onAdd}
      />
    );
  }

  const columns: DataTableColumn<ProjectClient>[] = [
    {
      key: 'name',
      label: t('projects.clients.name'),
      icon: <Users size={12} />,
      width: 180,
      sortable: true,
      render: (client) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {client.name}
        </span>
      ),
    },
    {
      key: 'email',
      label: t('projects.clients.email'),
      icon: <Mail size={12} />,
      width: 180,
      sortable: true,
      render: (client) => (
        <span className="dt-cell-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {client.email || '-'}
        </span>
      ),
    },
    {
      key: 'projectCount',
      label: t('projects.sidebar.projects'),
      icon: <FolderKanban size={12} />,
      width: 70,
      sortable: true,
      align: 'right',
      render: (client) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{client.projectCount}</span>
      ),
    },
    {
      key: 'totalBilled',
      label: t('projects.dashboard.totalBilled'),
      icon: <DollarSign size={12} />,
      width: 110,
      sortable: true,
      align: 'right',
      render: (client) => (
        <span className="dt-cell-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(client.totalBilled)}
        </span>
      ),
    },
    {
      key: 'outstandingAmount',
      label: t('projects.reports.outstanding'),
      icon: <DollarSign size={12} />,
      sortable: true,
      align: 'right',
      render: (client) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', fontVariantNumeric: 'tabular-nums', color: client.outstandingAmount > 0 ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }}>
          {formatCurrency(client.outstandingAmount)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={filtered}
      columns={columns}
      activeRowId={selectedId}
      onRowClick={(client) => onSelect(client.id)}
      onAddRow={onAdd}
      addRowLabel={t('projects.actions.addNew')}
      emptyTitle={t('projects.empty.noMatchingClients')}
      emptyDescription={t('projects.empty.tryDifferentSearch')}
      emptyIcon={<Users size={48} />}
    />
  );
}
