import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '../../../components/ui/skeleton';
import { Badge } from '../../../components/ui/badge';
import { ContentArea } from '../../../components/ui/content-area';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';
import { StatusDot } from '../../../components/ui/status-dot';
import { useProjects, useUpdateProjectStatus, type WorkProject } from '../hooks';
import { formatCurrency } from '../../../lib/format';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

interface BoardColumn {
  status: WorkProject['status'];
  labelKey: string;
  color: string;
  badgeVariant: BadgeVariant;
}

const COLUMNS: BoardColumn[] = [
  { status: 'active', labelKey: 'work.board.active', color: 'var(--color-success)', badgeVariant: 'success' },
  { status: 'paused', labelKey: 'work.board.paused', color: 'var(--color-warning)', badgeVariant: 'warning' },
  { status: 'completed', labelKey: 'work.board.completed', color: 'var(--color-text-tertiary)', badgeVariant: 'default' },
  { status: 'archived', labelKey: 'work.board.archived', color: 'var(--color-border-primary)', badgeVariant: 'default' },
];

export function ProjectsBoardView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useProjects();
  const updateStatus = useUpdateProjectStatus();

  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  const projects = data?.projects ?? [];

  const handleDragStart = useCallback((e: React.DragEvent, projectId: string) => {
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', projectId);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedProjectId(null);
    setDragOverStatus(null);
    dragCounterRef.current = {};
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    dragCounterRef.current[status] = (dragCounterRef.current[status] ?? 0) + 1;
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    dragCounterRef.current[status] = (dragCounterRef.current[status] ?? 0) - 1;
    if (dragCounterRef.current[status] <= 0) {
      dragCounterRef.current[status] = 0;
      setDragOverStatus((prev) => (prev === status ? null : prev));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, status: string) => {
      e.preventDefault();
      const projectId = e.dataTransfer.getData('text/plain');
      if (projectId) {
        const project = projects.find((p) => p.id === projectId);
        if (project && project.status !== status) {
          updateStatus.mutate({ id: projectId, status });
        }
      }
      setDraggedProjectId(null);
      setDragOverStatus(null);
      dragCounterRef.current = {};
    },
    [projects, updateStatus],
  );

  const projectsByStatus = useMemo(() => {
    const byStatus: Record<string, WorkProject[]> = {};
    for (const col of COLUMNS) {
      byStatus[col.status] = [];
    }
    for (const project of projects) {
      if (byStatus[project.status]) {
        byStatus[project.status].push(project);
      }
    }
    return byStatus;
  }, [projects]);

  if (isLoading) {
    return (
      <ContentArea title={t('work.board.title')}>
        <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Skeleton style={{ height: 200, width: '100%' }} />
          <Skeleton style={{ height: 200, width: '100%' }} />
        </div>
      </ContentArea>
    );
  }

  if (projects.length === 0) {
    return (
      <ContentArea title={t('work.board.title')}>
        <FeatureEmptyState
          illustration="pipeline"
          title={t('work.board.emptyTitle')}
          description={t('work.board.emptyDescription')}
        />
      </ContentArea>
    );
  }

  return (
    <ContentArea title={t('work.board.title')}>
      <div className="work-board">
        {COLUMNS.map((col) => {
          const colProjects = projectsByStatus[col.status] || [];
          const isOver = dragOverStatus === col.status;

          return (
            <div
              key={col.status}
              className={`work-board-column${isOver ? ' drag-over' : ''}`}
              onDragEnter={(e) => handleDragEnter(e, col.status)}
              onDragLeave={(e) => handleDragLeave(e, col.status)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              <div className="work-board-column-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  <StatusDot color={col.color} size={8} />
                  <span style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-family)',
                  }}>
                    {t(col.labelKey)}
                  </span>
                </div>
                <Badge variant={col.badgeVariant}>{colProjects.length}</Badge>
              </div>

              <div className="work-board-cards">
                {colProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`work-board-card${draggedProjectId === project.id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => navigate(`/work?projectId=${project.id}`)}
                  >
                    {/* Project name with color dot */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      marginBottom: 'var(--spacing-xs)',
                    }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: project.color,
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-family)',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {project.name}
                      </span>
                    </div>

                    {/* Company */}
                    {project.companyName && (
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        fontFamily: 'var(--font-family)',
                        marginBottom: 'var(--spacing-xs)',
                      }}>
                        {project.companyName}
                      </div>
                    )}

                    {/* Hours + Amount row */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--spacing-sm)',
                      marginBottom: project.budgetHours ? 'var(--spacing-xs)' : 0,
                    }}>
                      <span style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-family)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {project.totalHours.toFixed(1)}h
                      </span>
                      {project.totalAmount > 0 && (
                        <span style={{
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-semibold)',
                          color: 'var(--color-text-secondary)',
                          fontFamily: 'var(--font-family)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {formatCurrency(project.totalAmount)}
                        </span>
                      )}
                    </div>

                    {/* Budget progress bar */}
                    {project.budgetHours != null && project.budgetHours > 0 && (
                      <div style={{
                        height: 4,
                        borderRadius: 2,
                        background: 'var(--color-bg-tertiary)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          borderRadius: 2,
                          width: `${Math.min(100, (project.totalHours / project.budgetHours) * 100)}%`,
                          background: project.totalHours > project.budgetHours
                            ? 'var(--color-error)'
                            : project.color,
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                    )}
                  </div>
                ))}

                {colProjects.length === 0 && (
                  <div style={{
                    padding: 'var(--spacing-lg)',
                    textAlign: 'center',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-family)',
                  }}>
                    {t('work.board.noProjects')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ContentArea>
  );
}
