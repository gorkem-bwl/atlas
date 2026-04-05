import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { BookTemplate, Play, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { IconButton } from '../../../components/ui/icon-button';
import { FeatureEmptyState } from '../../../components/ui/feature-empty-state';

interface TemplateItem {
  id: string;
  title: string;
  pageCount: number;
  fields: unknown[];
}

export function SignTemplatesView({
  templates,
  templatesLoading,
  onCreateFromTemplate,
  isCreating,
  onDeleteTemplate,
}: {
  templates: TemplateItem[] | undefined;
  templatesLoading: boolean;
  onCreateFromTemplate: (templateId: string) => void;
  isCreating: boolean;
  onDeleteTemplate: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
      {templatesLoading ? (
        <div className="sign-empty">{t('common.loading')}</div>
      ) : !templates || templates.length === 0 ? (
        <FeatureEmptyState
          illustration="documents"
          title={t('sign.templates.empty')}
          description={t('sign.templates.emptyDesc')}
          highlights={[]}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-lg)',
                background: 'var(--color-bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <BookTemplate size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                <span style={{ fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'], fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {tpl.title}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                <span>{tpl.pageCount} {t('sign.list.pages').toLowerCase()}</span>
                <span>&middot;</span>
                <span>{t('sign.templates.fieldCount', { count: tpl.fields.length })}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play size={13} />}
                  onClick={() => onCreateFromTemplate(tpl.id)}
                  disabled={isCreating}
                >
                  {t('sign.templates.useTemplate')}
                </Button>
                <IconButton
                  icon={<Trash2 size={14} />}
                  label={t('sign.templates.deleteTemplate')}
                  size={28}
                  destructive
                  onClick={() => onDeleteTemplate(tpl.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
