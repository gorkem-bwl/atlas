import { useState, useRef } from 'react';
import { Plus, Globe, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TaskWhen } from '@atlas-platform/shared';
import { useCreateTask } from '../hooks';

export function NewTaskCreator({
  defaultWhen,
  projectId,
  headingId,
  defaultVisibility = 'team',
  onCreated,
}: {
  defaultWhen: TaskWhen;
  projectId?: string | null;
  headingId?: string | null;
  defaultVisibility?: 'private' | 'team';
  onCreated?: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'team'>(defaultVisibility);
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    createTask.mutate(
      {
        title: trimmed,
        when: defaultWhen,
        projectId: projectId ?? undefined,
        headingId: headingId ?? undefined,
        visibility,
      },
      {
        onSuccess: () => {
          setTitle('');
          onCreated?.();
          inputRef.current?.focus();
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="task-new-persistent">
      <Plus size={16} className="task-new-persistent-icon" />
      <input
        ref={inputRef}
        className="task-new-persistent-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('tasks.quickAdd')}
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
