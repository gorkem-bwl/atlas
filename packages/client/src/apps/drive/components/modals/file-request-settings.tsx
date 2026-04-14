import { useTranslation } from 'react-i18next';
import { Input } from '../../../../components/ui/input';

interface Props {
  instructions: string;
  requireEmail: boolean;
  onInstructionsChange: (v: string) => void;
  onRequireEmailChange: (v: boolean) => void;
}

export function FileRequestSettings({
  instructions,
  requireEmail,
  onInstructionsChange,
  onRequireEmailChange,
}: Props) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        marginTop: 'var(--spacing-md)',
        padding: 'var(--spacing-md)',
        background: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
        {t('drive.share.uploadOnlyHint')}
      </div>
      <Input
        label={t('drive.share.uploadInstructionsLabel')}
        size="sm"
        value={instructions}
        onChange={(e) => onInstructionsChange(e.target.value)}
        placeholder={t('drive.share.uploadInstructionsPlaceholder')}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={requireEmail}
          onChange={(e) => onRequireEmailChange(e.target.checked)}
          style={{ accentColor: 'var(--color-accent-primary)' }}
        />
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
          {t('drive.share.requireEmail')}
        </span>
      </label>
    </div>
  );
}
