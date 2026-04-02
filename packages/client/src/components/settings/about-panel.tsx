import { type CSSProperties } from 'react';
import { LayoutGrid } from 'lucide-react';
import {
  SettingsSection,
  SettingsRow,
} from './settings-primitives';

export function AboutPanel() {
  return (
    <div>
      <SettingsSection title="About Atlas">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xl)',
            padding: 'var(--spacing-xl)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-secondary)',
            marginBottom: 'var(--spacing-xl)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LayoutGrid size={28} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-2xl)',
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              Atlas
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 'var(--font-size-md)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              All-in-one business platform
            </div>
          </div>
        </div>

        <SettingsRow label="Version" description="Current application version">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              background: 'var(--color-bg-tertiary)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-secondary)',
            }}
          >
            1.3.0
          </span>
        </SettingsRow>

        <SettingsRow label="Built with" description="Core technologies">
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['React', 'TypeScript', 'Express', 'PostgreSQL'].map((name) => (
              <span
                key={name}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-bg-tertiary)',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border-secondary)',
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

    </div>
  );
}
