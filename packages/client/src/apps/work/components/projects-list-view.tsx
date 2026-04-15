import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, FolderKanban } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Modal } from '../../../components/ui/modal';
import { ContentArea } from '../../../components/ui/content-area';
import { useProjects, useCreateProject } from '../hooks';
import { useAppActions } from '../../../hooks/use-app-permissions';

function CreateProjectModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const createProject = useCreateProject();

  const submit = () => {
    if (!name.trim()) return;
    createProject.mutate({ name: name.trim() }, {
      onSuccess: (project) => {
        onOpenChange(false);
        setName('');
        navigate(`/work?projectId=${project.id}`);
      },
    });
  };

  const close = (next: boolean) => {
    if (!next) setName('');
    onOpenChange(next);
  };

  return (
    <Modal open={open} onOpenChange={close} width={400} title={t('work.createProject.title')}>
      <Modal.Header title={t('work.createProject.title')} />
      <Modal.Body>
        <Input
          label={t('work.createProject.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('work.createProject.namePlaceholder')}
          size="md"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" size="md" onClick={() => close(false)}>
          {t('work.createProject.cancel')}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={submit}
          disabled={!name.trim() || createProject.isPending}
        >
          {t('work.createProject.submit')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export function ProjectsListView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useProjects();
  const projects = data?.projects ?? [];
  const { canCreate } = useAppActions('work');
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <ContentArea
      title={t('work.sidebar.projects')}
      actions={canCreate ? (
        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>
          {t('work.sidebar.newProject')}
        </Button>
      ) : null}
    >
      <CreateProjectModal open={createOpen} onOpenChange={setCreateOpen} />
      <div style={{ padding: 'var(--spacing-lg)' }}>
        {isLoading ? (
          <div style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>{t('work.loading')}</div>
        ) : projects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-2xl)', color: 'var(--color-text-tertiary)' }}>
            <FolderKanban size={32} />
            <span style={{ fontSize: 'var(--font-size-sm)' }}>{t('work.empty.projects')}</span>
            {canCreate && (
              <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>
                {t('work.sidebar.newProject')}
              </Button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--color-text-tertiary)', borderBottom: '1px solid var(--color-border-secondary)' }}>
                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 'var(--font-weight-medium)' }}>{t('work.projectsList.colName')}</th>
                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 'var(--font-weight-medium)' }}>{t('work.projectsList.colStatus')}</th>
                <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 'var(--font-weight-medium)' }}>{t('work.projectsList.colUpdated')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/work?projectId=${p.id}`)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <FolderKanban size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>{p.name}</span>
                    </div>
                    {p.description && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)', marginTop: 2, paddingLeft: 22, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--color-text-secondary)' }}>
                    {p.status ?? '—'}
                  </td>
                  <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--color-text-tertiary)' }}>
                    {p.updatedAt ? String(p.updatedAt).slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ContentArea>
  );
}
