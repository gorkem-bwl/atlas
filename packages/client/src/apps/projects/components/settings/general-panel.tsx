import { useTranslation } from 'react-i18next';
import { useProjectSettings, useUpdateProjectSettings } from '../../hooks';
import { useTenantFormatSettings } from '../../../../hooks/use-tenant-format-settings';
import { useUIStore } from '../../../../stores/ui-store';
import {
  SettingsSection,
  SettingsRow,
  SettingsSelect,
  SettingsToggle,
} from '../../../../components/settings/settings-primitives';
import { Button } from '../../../../components/ui/button';

export function ProjectsGeneralPanel() {
  const { t } = useTranslation();
  const { data: settings } = useProjectSettings();
  const update = useUpdateProjectSettings();
  const { data: tenantFormats } = useTenantFormatSettings();
  const { openSettings } = useUIStore();

  const weekStart = settings?.weekStartDay ?? 'monday';
  const visibility = settings?.defaultProjectVisibility ?? 'team';
  const billable = settings?.defaultBillable ?? true;
  const timeRounding = String(settings?.timeRounding ?? 0);

  return (
    <div>
      <SettingsSection title={t('projects.settings.general')}>
        <SettingsRow label={t('projects.settings.weekStartDay')}>
          <SettingsSelect
            value={weekStart}
            options={[
              { value: 'monday', label: t('projects.settings.weekStartMonday') },
              { value: 'sunday', label: t('projects.settings.weekStartSunday') },
            ]}
            onChange={(v) => update.mutate({ weekStartDay: v as 'monday' | 'sunday' })}
          />
        </SettingsRow>

        <SettingsRow label={t('projects.settings.defaultVisibility')}>
          <SettingsSelect
            value={visibility}
            options={[
              { value: 'team', label: t('projects.settings.visibilityTeam') },
              { value: 'private', label: t('projects.settings.visibilityPrivate') },
            ]}
            onChange={(v) =>
              update.mutate({ defaultProjectVisibility: v as 'team' | 'private' })
            }
          />
        </SettingsRow>

        <SettingsRow label={t('projects.settings.defaultBillable')}>
          <SettingsToggle
            checked={billable}
            onChange={(checked) => update.mutate({ defaultBillable: checked })}
            label={t('projects.settings.defaultBillable')}
          />
        </SettingsRow>

        <SettingsRow label={t('projects.settings.timeRounding')}>
          <SettingsSelect
            value={timeRounding}
            options={[
              { value: '0', label: t('projects.settings.timeRoundingOff') },
              { value: '5', label: t('projects.settings.timeRounding5') },
              { value: '10', label: t('projects.settings.timeRounding10') },
              { value: '15', label: t('projects.settings.timeRounding15') },
              { value: '30', label: t('projects.settings.timeRounding30') },
              { value: '60', label: t('projects.settings.timeRounding60') },
            ]}
            onChange={(v) => update.mutate({ timeRounding: Number(v) })}
          />
        </SettingsRow>

        <SettingsRow
          label={t('projects.settings.defaultCurrency')}
          description={t('projects.settings.inheritedFromFormats')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {tenantFormats?.defaultCurrency ?? 'USD'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openSettings('global', 'formats')}
            >
              {t('projects.settings.editInFormats')}
            </Button>
          </div>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
