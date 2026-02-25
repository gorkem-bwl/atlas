import { useState } from 'react';
import {
  Inbox,
  Mail,
  MailOpen,
  Newspaper,
  Bell,
  Star,
  Settings,
  Edit,
  Sun,
  Moon,
  Monitor,
  Send,
  FileText,
  Archive,
  Trash2,
  AlertOctagon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEmailStore } from '../../stores/email-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useUIStore } from '../../stores/ui-store';
import { useLabelStore } from '../../stores/label-store';
import { useThreadCounts } from '../../hooks/use-threads';
import { AccountSwitcher } from './account-switcher';
import { LabelTree } from '../email/label-tree';
import type { EmailCategory } from '@atlasmail/shared';
import type { ThemeMode } from '@atlasmail/shared';
import type { CSSProperties } from 'react';
import type { Mailbox } from '../../stores/email-store';

interface NavItem {
  id: EmailCategory;
  icon: typeof Inbox;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'all', icon: Inbox },
  { id: 'important', icon: Star },
  { id: 'newsletters', icon: Newspaper },
  { id: 'notifications', icon: Bell },
  { id: 'other', icon: Mail },
];

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  all: 'var(--color-category-important)',
  important: 'var(--color-star)',
  other: 'var(--color-category-other)',
  newsletters: 'var(--color-category-newsletters)',
  notifications: 'var(--color-category-notifications)',
};

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

const THEME_ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
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
        background: 'var(--color-accent-subtle)',
        color: 'var(--color-accent-primary)',
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
  unreadCount,
  totalCount,
  onSelect,
}: {
  id: EmailCategory;
  label: string;
  icon: typeof Inbox;
  isActive: boolean;
  color: string;
  unreadCount: number;
  totalCount: number;
  onSelect: () => void;
}) {

  return (
    <button
      key={id}
      className="sidebar-nav-btn"
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: '6px var(--spacing-md)',
        background: isActive ? 'var(--color-surface-selected)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: isActive ? color : 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family)',
        fontWeight: isActive
          ? ('var(--font-weight-semibold)' as CSSProperties['fontWeight'])
          : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
        cursor: 'pointer',
        transition: 'background var(--transition-normal), color var(--transition-normal)',
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
      <Icon size={16} className="sidebar-nav-icon" style={{ flexShrink: 0, color: color }} />
      <span style={{ flex: 1 }}>{label}</span>
      <UnreadBadge count={unreadCount} />
    </button>
  );
}

interface MailboxNavItemDef {
  id: Mailbox;
  icon: typeof Inbox;
}

const MAILBOX_NAV_ITEMS: MailboxNavItemDef[] = [
  { id: 'starred', icon: Star },
  { id: 'unread', icon: MailOpen },
  { id: 'sent', icon: Send },
  { id: 'drafts', icon: FileText },
  { id: 'archive', icon: Archive },
  { id: 'spam', icon: AlertOctagon },
  { id: 'trash', icon: Trash2 },
];

const MAILBOX_COLORS: Record<Mailbox, string> = {
  inbox: 'currentColor',
  starred: '#d4a017',
  unread: '#5a7fa0',
  sent: '#4a9e8f',
  drafts: '#c4856c',
  archive: '#7889a0',
  trash: '#c45a5a',
  spam: '#d4954a',
};

function MailboxNavItem({
  mailbox,
  label,
  icon: Icon,
  isActive,
  color,
  totalCount,
  onSelect,
}: {
  mailbox: Mailbox;
  label: string;
  icon: typeof Inbox;
  isActive: boolean;
  color: string;
  totalCount: number;
  onSelect: () => void;
}) {
  return (
    <button
      className="sidebar-nav-btn"
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: '6px var(--spacing-md)',
        background: isActive ? 'var(--color-surface-selected)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family)',
        fontWeight: isActive
          ? ('var(--font-weight-semibold)' as CSSProperties['fontWeight'])
          : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
        cursor: 'pointer',
        transition: 'background var(--transition-normal), color var(--transition-normal)',
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
      <Icon size={16} className="sidebar-nav-icon" style={{ flexShrink: 0, color: color }} />
      <span style={{ flex: 1 }}>{label}</span>
      {totalCount > 0 && (
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}
        >
          {totalCount > 999 ? '999+' : totalCount}
        </span>
      )}
    </button>
  );
}

function ThemeToggleButton() {
  const { theme, setTheme } = useSettingsStore();
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  const ThemeIcon = THEME_ICONS[theme];

  const THEME_LABELS: Record<ThemeMode, string> = {
    light: t('sidebar.lightMode'),
    dark: t('sidebar.darkMode'),
    system: t('sidebar.systemMode'),
  };

  const label = THEME_LABELS[theme];

  function cycleTheme() {
    const currentIndex = THEME_CYCLE.indexOf(theme);
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={cycleTheme}
        aria-label={t('sidebar.themeAriaLabel', { label })}
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
          transition: 'background var(--transition-normal), color var(--transition-normal), transform 150ms ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          setShowTooltip(true);
          e.currentTarget.style.background = 'var(--color-surface-hover)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
          e.currentTarget.style.transform = 'rotate(15deg)';
        }}
        onMouseLeave={(e) => {
          setShowTooltip(false);
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
          e.currentTarget.style.transform = 'rotate(0deg)';
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
  const { activeCategory, setActiveCategory, activeMailbox, setActiveMailbox, openCompose, filterByLabel, setFilterByLabel } =
    useEmailStore();
  const { toggleSettings } = useUIStore();
  const { t } = useTranslation();
  const labels = useLabelStore((s) => s.labels);
  const { data: counts } = useThreadCounts();

  const CATEGORY_LABELS: Record<EmailCategory, string> = {
    all: t('sidebar.allMail'),
    important: t('sidebar.important'),
    other: t('sidebar.other'),
    newsletters: t('sidebar.newsletters'),
    notifications: t('sidebar.notifications'),
  };

  const MAILBOX_LABELS: Record<string, string> = {
    starred: t('sidebar.starred'),
    unread: t('sidebar.unread'),
    sent: t('sidebar.sent'),
    drafts: t('sidebar.drafts'),
    archive: t('sidebar.archive'),
    trash: t('sidebar.trash'),
    spam: t('sidebar.spam'),
  };

  // Detect Electron desktop shell (set by preload script)
  const isDesktop = !!('atlasDesktop' in window);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--spacing-sm) var(--spacing-sm)',
        paddingTop: isDesktop ? 40 : undefined,
        boxSizing: 'border-box',
      }}
    >
      {/* Brand header with theme toggle — also serves as drag region on desktop */}
      <div
        className={isDesktop ? 'desktop-drag-region' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          padding: 'var(--spacing-xs) var(--spacing-xs)',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Mail size={16} color="#ffffff" />
        </div>
        <span
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
            flex: 1,
          }}
        >
          AtlasMail
        </span>
        <ThemeToggleButton />
      </div>

      {/* Compose button */}
      <button
        className="sidebar-nav-btn"
        onClick={() => openCompose('new')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          width: '100%',
          padding: '6px var(--spacing-md)',
          marginBottom: 'var(--spacing-md)',
          background: 'var(--color-accent-subtle)',
          color: 'var(--color-accent-primary)',
          border: '1px solid color-mix(in srgb, var(--color-accent-primary) 20%, transparent)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          fontFamily: 'var(--font-family)',
          cursor: 'pointer',
          transition: 'background var(--transition-normal)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-accent-subtle-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--color-accent-subtle)';
        }}
      >
        <Edit size={15} className="sidebar-nav-icon" />
        {t('compose.newMessage')}
        <span
          aria-hidden="true"
          style={{
            marginLeft: 'auto',
            fontSize: 'var(--font-size-xs)',
            opacity: 0.5,
            fontFamily: 'var(--font-mono)',
            background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
            padding: '1px 5px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          C
        </span>
      </button>

      {/* Category navigation */}
      <nav
        aria-label="Email categories"
        style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
      >
        {NAV_ITEMS.map(({ id, icon }) => (
          <CategoryNavItem
            key={id}
            id={id}
            label={CATEGORY_LABELS[id]}
            icon={icon}
            isActive={activeMailbox === 'inbox' && activeCategory === id}
            color={CATEGORY_COLORS[id]}
            unreadCount={counts?.categories[id]?.unread ?? 0}
            totalCount={counts?.categories[id]?.total ?? 0}
            onSelect={() => setActiveCategory(id)}
          />
        ))}
      </nav>

      {/* Separator */}
      <div
        aria-hidden="true"
        style={{
          height: 1,
          background: 'var(--color-border-primary)',
          margin: 'var(--spacing-xs) 0',
          flexShrink: 0,
        }}
      />

      {/* Mailbox navigation */}
      <nav
        aria-label="Mailboxes"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}
      >
        {MAILBOX_NAV_ITEMS.map(({ id, icon }) => (
          <MailboxNavItem
            key={id}
            mailbox={id}
            label={MAILBOX_LABELS[id]}
            icon={icon}
            color={MAILBOX_COLORS[id]}
            isActive={activeMailbox === id}
            totalCount={counts?.mailboxes[id]?.total ?? 0}
            onSelect={() => setActiveMailbox(id)}
          />
        ))}

        {/* Labels section */}
        {labels.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-xs)' }}>
            <div
              aria-hidden="true"
              style={{
                height: 1,
                background: 'var(--color-border-primary)',
                margin: 'var(--spacing-xs) 0',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px var(--spacing-md)' }}>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                  fontWeight: 500,
                  flex: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('labels.labelsSection')}
              </span>
            </div>
            <LabelTree
              labels={labels}
              parentId={null}
              depth={0}
              activeLabel={filterByLabel}
              onSelect={(id) => setFilterByLabel(filterByLabel === id ? null : id)}
            />
          </div>
        )}
      </nav>

      {/* Bottom section: theme toggle + settings + account switcher */}
      <div
        style={{
          borderTop: '1px solid var(--color-border-primary)',
          paddingTop: 'var(--spacing-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {/* Settings button */}
        <button
          className="sidebar-nav-btn"
          onClick={toggleSettings}
          aria-label={t('settings.title')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            width: '100%',
            padding: '6px var(--spacing-md)',
            background: 'transparent',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
            cursor: 'pointer',
            transition: 'background var(--transition-normal), color var(--transition-normal)',
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
          <Settings size={16} className="sidebar-nav-icon" style={{ color: '#7889a0' }} />
          {t('settings.title')}
        </button>

        <AccountSwitcher />
      </div>
    </div>
  );
}
