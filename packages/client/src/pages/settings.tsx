import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Monitor, Moon, Sun, AlignLeft, AlignRight, AlignCenter } from 'lucide-react';
import { useSettingsStore } from '../stores/settings-store';
import { Button } from '../components/ui/button';
import type { ThemeMode, Density } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <div
      style={{
        padding: 'var(--spacing-xl)',
        borderBottom: '1px solid var(--color-border-primary)',
      }}
    >
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              margin: 'var(--spacing-xs) 0 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
}

function OptionCard({ label, description, icon, isSelected, onClick }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-lg)',
        background: isSelected ? 'var(--color-surface-selected)' : 'var(--color-bg-elevated)',
        border: `1px solid ${isSelected ? 'var(--color-accent-primary)' : 'var(--color-border-primary)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'border-color var(--transition-fast), background var(--transition-fast)',
        fontFamily: 'var(--font-family)',
        minWidth: 100,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--color-surface-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = 'var(--color-bg-elevated)';
        }
      }}
    >
      {icon && (
        <span
          style={{
            color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
          }}
        >
          {icon}
        </span>
      )}
      <span
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: isSelected
            ? ('var(--font-weight-semibold)' as CSSProperties['fontWeight'])
            : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
          color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
        }}
      >
        {label}
      </span>
      {description && (
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            textAlign: 'center',
          }}
        >
          {description}
        </span>
      )}
    </button>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { theme, density, readingPane, setTheme, setDensity, setReadingPane } = useSettingsStore();

  const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={20} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={20} /> },
    { value: 'system', label: 'System', icon: <Monitor size={20} /> },
  ];

  const densities: { value: Density; label: string; description: string }[] = [
    { value: 'compact', label: 'Compact', description: 'More emails visible' },
    { value: 'default', label: 'Default', description: 'Balanced view' },
    { value: 'comfortable', label: 'Comfortable', description: 'More breathing room' },
  ];

  const readingPaneOptions: { value: 'right' | 'bottom' | 'hidden'; label: string; icon: React.ReactNode }[] = [
    { value: 'right', label: 'Right', icon: <AlignRight size={18} /> },
    { value: 'bottom', label: 'Bottom', icon: <AlignCenter size={18} /> },
    { value: 'hidden', label: 'Hidden', icon: <AlignLeft size={18} /> },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-family)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-lg) var(--spacing-xl)',
          borderBottom: '1px solid var(--color-border-primary)',
          background: 'var(--color-bg-secondary)',
          flexShrink: 0,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={() => navigate('/')}
          aria-label="Back to inbox"
        >
          Back
        </Button>
        <h1
          style={{
            margin: 0,
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
          }}
        >
          Settings
        </h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--spacing-2xl)' }}>

          {/* Theme */}
          <SettingsSection
            title="Appearance"
            description="Choose your preferred color theme."
          >
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
              {themes.map(({ value, label, icon }) => (
                <OptionCard
                  key={value}
                  label={label}
                  icon={icon}
                  isSelected={theme === value}
                  onClick={() => setTheme(value)}
                />
              ))}
            </div>
          </SettingsSection>

          {/* Density */}
          <SettingsSection
            title="Density"
            description="Control how much information is shown in the email list."
          >
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
              {densities.map(({ value, label, description }) => (
                <OptionCard
                  key={value}
                  label={label}
                  description={description}
                  isSelected={density === value}
                  onClick={() => setDensity(value)}
                />
              ))}
            </div>
          </SettingsSection>

          {/* Reading pane */}
          <SettingsSection
            title="Reading pane"
            description="Choose where the reading pane appears."
          >
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
              {readingPaneOptions.map(({ value, label, icon }) => (
                <OptionCard
                  key={value}
                  label={label}
                  icon={icon}
                  isSelected={readingPane === value}
                  onClick={() => setReadingPane(value)}
                />
              ))}
            </div>
          </SettingsSection>

          {/* Keyboard shortcuts reference */}
          <SettingsSection
            title="Keyboard shortcuts"
            description="Speed through your inbox with these shortcuts."
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-sm)',
              }}
            >
              {[
                { shortcut: 'J / K', label: 'Move down / up' },
                { shortcut: 'Enter', label: 'Open conversation' },
                { shortcut: 'E', label: 'Archive' },
                { shortcut: 'S', label: 'Star / Unstar' },
                { shortcut: 'C', label: 'Compose new' },
                { shortcut: 'R', label: 'Reply' },
                { shortcut: 'Shift+R', label: 'Reply all' },
                { shortcut: 'F', label: 'Forward' },
                { shortcut: '/', label: 'Search' },
                { shortcut: 'Cmd+K', label: 'Command palette' },
                { shortcut: 'G I', label: 'Go to important' },
                { shortcut: 'G O', label: 'Go to other' },
                { shortcut: 'G N', label: 'Go to newsletters' },
                { shortcut: 'G T', label: 'Go to notifications' },
              ].map(({ shortcut, label }) => (
                <div
                  key={shortcut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'var(--color-bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-primary)',
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                    {label}
                  </span>
                  <kbd
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-tertiary)',
                      background: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border-primary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '2px var(--spacing-xs)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </SettingsSection>

          {/* App version */}
          <div
            style={{
              padding: 'var(--spacing-lg) var(--spacing-xl)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              textAlign: 'center',
            }}
          >
            AtlasMail 0.1.0
          </div>
        </div>
      </div>
    </div>
  );
}
