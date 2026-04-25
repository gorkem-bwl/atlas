import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { SettingsSection } from '../../../../components/settings/settings-primitives';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Select } from '../../../../components/ui/select';
import { IconButton } from '../../../../components/ui/icon-button';
import { ConfirmDialog } from '../../../../components/ui/confirm-dialog';
import { useToastStore } from '../../../../stores/toast-store';
import {
  useTaskStatuses,
  useCreateTaskStatus,
  useUpdateTaskStatus,
  useArchiveTaskStatus,
  type TaskStatusCategory,
  type TaskStatusRow,
} from '../../hooks';

const CATEGORY_OPTIONS: Array<{ value: TaskStatusCategory; labelKey: string }> = [
  { value: 'open', labelKey: 'work.settings.statuses.categoryOpen' },
  { value: 'done', labelKey: 'work.settings.statuses.categoryDone' },
  { value: 'cancelled', labelKey: 'work.settings.statuses.categoryCancelled' },
];

const PRESET_COLORS = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export function WorkStatusesPanel() {
  const { t } = useTranslation();
  const { data: statuses = [] } = useTaskStatuses();
  const create = useCreateTaskStatus();
  const update = useUpdateTaskStatus();
  const archive = useArchiveTaskStatus();
  const { addToast } = useToastStore();

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<TaskStatusCategory>('open');
  const [newColor, setNewColor] = useState('#6B7280');
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  const categoryLabel = (cat: TaskStatusCategory) =>
    t(CATEGORY_OPTIONS.find((o) => o.value === cat)!.labelKey);

  const handleCreate = () => {
    if (!newName.trim()) return;
    create.mutate(
      { name: newName.trim(), category: newCategory, color: newColor },
      {
        onSuccess: () => {
          setNewName('');
          setNewCategory('open');
          setNewColor('#6B7280');
          addToast({ type: 'success', message: t('work.settings.statuses.created') });
        },
      },
    );
  };

  const handleRename = (s: TaskStatusRow, name: string) => {
    if (!name.trim() || name === s.name) return;
    update.mutate({ id: s.id, updatedAt: s.updatedAt, name: name.trim() });
  };

  const handleColorChange = (s: TaskStatusRow, color: string) => {
    update.mutate({ id: s.id, updatedAt: s.updatedAt, color });
  };

  const handleCategoryChange = (s: TaskStatusRow, category: TaskStatusCategory) => {
    update.mutate({ id: s.id, updatedAt: s.updatedAt, category });
  };

  const handleArchive = () => {
    if (!confirmArchiveId) return;
    archive.mutate(confirmArchiveId, {
      onSuccess: () => {
        addToast({ type: 'success', message: t('work.settings.statuses.archived') });
        setConfirmArchiveId(null);
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? t('work.settings.statuses.archiveFailed');
        addToast({ type: 'error', message: msg });
        setConfirmArchiveId(null);
      },
    });
  };

  return (
    <div>
      <SettingsSection
        title={t('work.settings.statuses.title')}
        description={t('work.settings.statuses.description')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {statuses.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 160px 140px 32px',
                gap: 'var(--spacing-sm)',
                alignItems: 'center',
                padding: 'var(--spacing-sm)',
                border: '1px solid var(--color-border-primary)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-elevated)',
              }}
            >
              <ColorSwatch color={s.color} onChange={(c) => handleColorChange(s, c)} />
              <Input
                key={s.updatedAt}
                size="sm"
                defaultValue={s.name}
                onBlur={(e) => handleRename(s, e.target.value)}
              />
              <Select
                size="sm"
                value={s.category}
                onChange={(v) => handleCategoryChange(s, v as TaskStatusCategory)}
                options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
              />
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
                {s.legacySlug ? t('work.settings.statuses.builtIn') : ''}
              </span>
              <IconButton
                icon={<Trash2 size={12} />}
                label={t('common.delete')}
                size={20}
                destructive
                disabled={s.legacySlug !== null}
                onClick={() => setConfirmArchiveId(s.id)}
              />
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title={t('work.settings.statuses.addTitle')}
        description={t('work.settings.statuses.addDescription')}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 160px auto', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <ColorSwatch color={newColor} onChange={setNewColor} />
          <Input
            size="sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('work.settings.statuses.namePlaceholder')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
          <Select
            size="sm"
            value={newCategory}
            onChange={(v) => setNewCategory(v as TaskStatusCategory)}
            options={CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={13} />}
            onClick={handleCreate}
            disabled={!newName.trim() || create.isPending}
          >
            {t('work.settings.statuses.add')}
          </Button>
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={!!confirmArchiveId}
        onOpenChange={(open) => { if (!open) setConfirmArchiveId(null); }}
        title={t('work.settings.statuses.archiveConfirmTitle')}
        description={t('work.settings.statuses.archiveConfirmDescription')}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={handleArchive}
      />
    </div>
  );
}

// Color swatch with click-to-cycle through PRESET_COLORS for now —
// keeping it tight in this PR; a proper color picker is a follow-up.
function ColorSwatch({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const cycle = () => {
    const idx = PRESET_COLORS.findIndex((c) => c.toLowerCase() === color.toLowerCase());
    const next = PRESET_COLORS[(idx + 1) % PRESET_COLORS.length];
    onChange(next);
  };
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label="Change color"
      style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: color,
        border: '1px solid var(--color-border-primary)',
        cursor: 'pointer',
        padding: 0,
      }}
    />
  );
}
