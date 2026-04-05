import { Lock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../ui/tooltip';

interface VisibilityToggleProps {
  visibility: 'private' | 'team';
  onToggle: (newVisibility: 'private' | 'team') => void;
  disabled?: boolean;
}

export function VisibilityToggle({ visibility, onToggle, disabled }: VisibilityToggleProps) {
  const { t } = useTranslation();
  const isTeam = visibility === 'team';

  return (
    <Tooltip content={isTeam ? t('common.visibilityTeam') : t('common.visibilityPrivate')}>
      <button
        onClick={() => onToggle(isTeam ? 'private' : 'team')}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-family)',
          cursor: disabled ? 'default' : 'pointer',
          borderColor: isTeam ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
          background: isTeam ? 'var(--color-accent-subtle)' : 'transparent',
          color: isTeam ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
        }}
      >
        {isTeam ? <Users size={12} /> : <Lock size={12} />}
        {isTeam ? t('common.team') : t('common.private')}
      </button>
    </Tooltip>
  );
}
