import { useState } from 'react';
import { Plus, Globe, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TaskWhen } from '@atlas-platform/shared';
import { useCreateTask } from '../hooks';

export function QuickCaptureInput({
  defaultWhen,
  projectId,
  headingId,
  defaultVisibility = 'team',
}: {
  defaultWhen: TaskWhen;
  projectId?: string | null;
  headingId?: string | null;
  defaultVisibility?: 'private' | 'team';
}) {
  const { t } = useTranslation();
  const createTask = useCreateTask();
  const [visibility, setVisibility] = useState<'private' | 'team'>(defaultVisibility);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', opacity: 0.6 }}>
      <Plus size={14} />
      <input
        placeholder={t('tasks.quickAdd')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            const title = e.currentTarget.value.trim();
            createTask.mutate({
              title,
              when: defaultWhen,
              projectId: projectId ?? undefined,
              headingId: headingId ?? undefined,
              visibility,
            });
            e.currentTarget.value = '';
          }
        }}
        style={{
          border: 'none',
          background: 'transparent',
          outline: 'none',
          flex: 1,
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-family)',
        }}
      />
      <button
        type="button"
        title={visibility === 'team' ? t('tasks.visibilityTeam') : t('tasks.visibilityPrivate')}
        onClick={() => setVisibility(v => v === 'team' ? 'private' : 'team')}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          color: visibility === 'team' ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
          flexShrink: 0,
        }}
      >
        {visibility === 'team' ? <Globe size={14} /> : <Lock size={14} />}
      </button>
    </div>
  );
}
