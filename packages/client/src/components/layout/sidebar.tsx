import { useState } from 'react';
import { Inbox, Mail, Newspaper, Bell, Settings, Edit, Sun, Moon, Monitor } from 'lucide-react';
import { useEmailStore } from '../../stores/email-store';
import { useAuthStore } from '../../stores/auth-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useUIStore } from '../../stores/ui-store';
import { useThreads } from '../../hooks/use-threads';
import { Avatar } from '../ui/avatar';
import type { EmailCategory } from '@atlasmail/shared';
import type { ThemeMode } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

interface NavItem {
  id: EmailCategory;
  label: string;
  icon: typeof Inbox;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'important', label: 'Important', icon: Inbox },
  { id: 'other', label: 'Other', icon: Mail },
  { id: 'newsletters', label: 'Newsletters', icon: Newspaper },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  important: 'var(--color-category-important)',
  other: 'var(--color-category-other)',
  newsletters: 'var(--color-category-newsletters)',
  notifications: 'var(--color-category-notifications)',
};

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

const THEME_META: Record<ThemeMode, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: 'Light mode' },
  dark: { icon: Moon, label: 'Dark mode' },
  system: { icon: Monitor, label: 'System mode' },
};

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        borderRadius: 9,
        background: 'var(--color-accent-primary)',
        color: '#ffffff',
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1,
        flexShrink: 0,
        boxSizing: 'border-box' as CSSProperties['boxSizing'],
      }}
    >
      {label}
    </span>
  );
}

function CategoryNavItem({
  id,
  label,
  icon: Icon,
  isActive,
  color,
  onSelect,
}: {
  id: EmailCategory;
  label: string;
  icon: typeof Inbox;
  isActive: boolean;
  color: string;
  onSelect: () => void;
}) {
  const { data: threads } = useThreads(id);
  const unreadCount = threads ? threads.filter((t) => t.unreadCount > 0).length : 0;

  return (
    <button
      key={id}
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: isActive ? 'var(--color-surface-selected)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: isActive ? color : 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-md)',
        fontFamily: 'var(--font-family)',
        fontWeight: isActive
          ? ('var(--font-weight-semibold)' as CSSProperties['fontWeight'])
          : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
        cursor: 'pointer',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--color-surface-hover)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }
      }}
    >
      <Icon size={16} style={{ flexShrink: 0, color: isActive ? color : 'currentColor' }} />
      <span style={{ flex: 1 }}>{label}</span>
      <UnreadBadge count={unreadCount} />
    </button>
  );
}

function ThemeToggleButton() {
  const { theme, setTheme } = useSettingsStore();
  const [showTooltip, setShowTooltip] = useState(false);

  const { icon: ThemeIcon, label } = THEME_META[theme];

  function cycleTheme() {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={cycleTheme}
        aria-label={`Theme: ${label}. Click to cycle theme`}
        title={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          padding: 0,
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          transition: 'background var(--transition-fast), color var(--transition-fast)',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          setShowTooltip(true);
          e.currentTarget.style.background = 'var(--color-surface-hover)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          setShowTooltip(false);
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        <ThemeIcon size={16} />
      </button>

      {showTooltip && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            padding: '4px 8px',
            background: 'var(--color-surface-overlay)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-family)',
            fontWeight: 500 as CSSProperties['fontWeight'],
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { activeCategory, setActiveCategory, openCompose } = useEmailStore();
  const account = useAuthStore((s) => s.account);
  const { toggleSettings } = useUIStore();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--spacing-md)',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-sm) var(--spacing-xs)',
          marginBottom: 'var(--spacing-md)',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Mail size={15} color="#ffffff" />
        </div>
        <span
          style={{
            fontSize: 'var(--font-size-md)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          AtlasMail
        </span>
      </div>

      {/* Compose button */}
      <button
        onClick={() => openCompose('new')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          width: '100%',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)',
          background: 'var(--color-accent-primary)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-md)',
          fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          fontFamily: 'var(--font-family)',
          cursor: 'pointer',
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-accent-primary-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-accent-primary)')}
      >
        <Edit size={15} />
        Compose
        <span
          aria-hidden="true"
          style={{
            marginLeft: 'auto',
            fontSize: 'var(--font-size-xs)',
            opacity: 0.7,
            fontFamily: 'var(--font-mono)',
            background: 'rgba(255,255,255,0.15)',
            padding: '1px 5px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          C
        </span>
      </button>

      {/* Category navigation */}
      <nav aria-label="Email categories" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <CategoryNavItem
            key={id}
            id={id}
            label={label}
            icon={icon}
            isActive={activeCategory === id}
            color={CATEGORY_COLORS[id]}
            onSelect={() => setActiveCategory(id)}
          />
        ))}
      </nav>

      {/* Bottom section: theme toggle + settings + account */}
      <div
        style={{
          borderTop: '1px solid var(--color-border-primary)',
          paddingTop: 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {/* Settings row with theme toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <button
            onClick={toggleSettings}
            aria-label="Settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              flex: 1,
              padding: 'var(--spacing-sm) var(--spacing-md)',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              cursor: 'pointer',
              transition: 'background var(--transition-fast), color var(--transition-fast)',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <Settings size={16} />
            Settings
          </button>

          <ThemeToggleButton />
        </div>

        {account && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <Avatar
              src={account.pictureUrl}
              name={account.name}
              email={account.email}
              size={26}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {account.name || account.email}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {account.email}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
