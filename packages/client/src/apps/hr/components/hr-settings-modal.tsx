import {
  SettingsSection,
  SettingsRow,
  SettingsSelect,
  SettingsToggle,
} from '../../../components/settings/settings-primitives';
import { useHrSettingsStore } from '../settings-store';

// ---------------------------------------------------------------------------
// Panel: General
// ---------------------------------------------------------------------------

export function HrGeneralPanel() {
  const { defaultView, setDefaultView } = useHrSettingsStore();

  return (
    <div>
      <SettingsSection title="General">
        <SettingsRow label="Default view" description="Which section to show when opening HR">
          <SettingsSelect
            value={defaultView}
            options={[
              { value: 'dashboard', label: 'Dashboard' },
              { value: 'employees', label: 'Employees' },
              { value: 'departments', label: 'Departments' },
              { value: 'org-chart', label: 'Org chart' },
              { value: 'time-off', label: 'Time off' },
            ]}
            onChange={setDefaultView}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Appearance
// ---------------------------------------------------------------------------

export function HrAppearancePanel() {
  const { showDepartmentInList, setShowDepartmentInList } = useHrSettingsStore();

  return (
    <div>
      <SettingsSection title="Display">
        <SettingsRow label="Show department in list" description="Display department column in employee list">
          <SettingsToggle
            checked={showDepartmentInList}
            onChange={setShowDepartmentInList}
            label="Show department in list"
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
