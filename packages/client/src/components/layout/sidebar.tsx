import { useNavigate } from 'react-router-dom';
import { Inbox, Mail, Newspaper, Bell, Settings, Edit } from 'lucide-react';
import { useEmailStore } from '../../stores/email-store';
import { useAuthStore } from '../../stores/auth-store';
import { Avatar } from '../ui/avatar';
import type { EmailCategory } from '@atlasmail/shared';
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

export function Sidebar() {
  const navigate = useNavigate();
  const { activeCategory, setActiveCategory, openCompose } = useEmailStore();
  const account = useAuthStore((s) => s.account);

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
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeCategory === id;
          const color = CATEGORY_COLORS[id];

          return (
            <button
              key={id}
              onClick={() => setActiveCategory(id)}
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
            </button>
          );
        })}
      </nav>

      {/* Bottom section: account + settings */}
      <div
        style={{
          borderTop: '1px solid var(--color-border-primary)',
          paddingTop: 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        <button
          onClick={() => navigate('/settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            width: '100%',
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
