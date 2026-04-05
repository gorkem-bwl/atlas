import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatNumber } from '../../../../lib/format';
import {
  FolderKanban, Clock, Users, BarChart3, Plus, DollarSign,
} from 'lucide-react';
import { type Project, type ProjectClient } from '../../hooks';
import { Badge } from '../../../../components/ui/badge';
import { DataTable, type DataTableColumn } from '../../../../components/ui/data-table';
import { FeatureEmptyState } from '../../../../components/ui/feature-empty-state';
import { StatusDot } from '../../../../components/ui/status-dot';

export function ProjectsListView({ projects, searchQuery, onSelect, selectedId, onAdd }: {
  projects: Project[];
  searchQuery: string;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onAdd: () => void;
  clients: ProjectClient[];
}) {
  const { t } = useTranslation();

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q) || (p.clientName?.toLowerCase().includes(q)));
  }, [projects, searchQuery]);

  if (filtered.length === 0 && !searchQuery) {
    return (
      <FeatureEmptyState
        illustration="pipeline"
        title={t('projects.empty.projectsTitle')}
        description={t('projects.empty.projectsDesc')}
        highlights={[
          { icon: <FolderKanban size={14} />, title: t('projects.empty.projectsH1Title'), description: t('projects.empty.projectsH1Desc') },
          { icon: <Clock size={14} />, title: t('projects.empty.projectsH2Title'), description: t('projects.empty.projectsH2Desc') },
          { icon: <BarChart3 size={14} />, title: t('projects.empty.projectsH3Title'), description: t('projects.empty.projectsH3Desc') },
        ]}
        actionLabel={t('projects.projects.createProject')}
        actionIcon={<Plus size={14} />}
        onAction={onAdd}
      />
    );
  }

  const columns: DataTableColumn<Project>[] = [
    {
      key: 'name',
      label: t('projects.projects.name'),
      icon: <FolderKanban size={12} />,
      width: 200,
      sortable: true,
      render: (project) => (
        <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <StatusDot color={project.color} size={8} />
          {project.name}
        </span>
      ),
    },
    {
      key: 'clientName',
      label: t('projects.invoices.client'),
      icon: <Users size={12} />,
      width: 140,
      sortable: true,
      render: (project) => (
        <span className="dt-cell-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.clientName || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('projects.projects.status'),
      width: 100,
      sortable: true,
      render: (project) => (
        <Badge variant={project.status === 'active' ? 'success' : project.status === 'paused' ? 'warning' : project.status === 'completed' ? 'primary' : 'default'}>
          {t(`projects.status.${project.status}`)}
        </Badge>
      ),
    },
    {
      key: 'totalHours',
      label: t('projects.reports.hours'),
      icon: <Clock size={12} />,
      width: 80,
      sortable: true,
      align: 'right',
      render: (project) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatNumber(project.totalHours, 1)}h</span>
      ),
    },
    {
      key: 'budgetAmount',
      label: t('projects.projects.budget'),
      icon: <DollarSign size={12} />,
      sortable: true,
      render: (project) => {
        const budgetPct = project.budgetHours ? Math.min((project.totalHours / project.budgetHours) * 100, 100) : 0;
        return (
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', overflow: 'hidden' }}>
            {project.budgetHours ? (
              <>
                <div style={{ flex: 1, height: 6, background: 'var(--color-bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${budgetPct}%`, background: budgetPct > 90 ? 'var(--color-error)' : budgetPct > 70 ? 'var(--color-warning)' : 'var(--color-success)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {formatNumber(budgetPct, 0)}%
                </span>
              </>
            ) : (
              <span className="dt-cell-secondary">-</span>
            )}
            {project.unbilledHours > 0 && (
              <span style={{ marginLeft: 'var(--spacing-sm)' }}>
                <Badge variant="warning">{formatNumber(project.unbilledHours, 1)}h {t('projects.dashboard.unbilled')}</Badge>
              </span>
            )}
            {project.totalAmount > 0 && (
              <span style={{ marginLeft: 'var(--spacing-xs)' }}>
                <Badge variant="success">{formatCurrency(project.totalAmount)}</Badge>
              </span>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      data={filtered}
      columns={columns}
      activeRowId={selectedId}
      onRowClick={(project) => onSelect(project.id)}
      onAddRow={onAdd}
      addRowLabel={t('projects.actions.addNew')}
      emptyTitle={t('projects.empty.noMatchingProjects')}
      emptyDescription={t('projects.empty.tryDifferentSearch')}
      emptyIcon={<FolderKanban size={48} />}
    />
  );
}
