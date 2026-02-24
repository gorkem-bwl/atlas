import { useState, type CSSProperties, type ReactNode, type ReactElement } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import {
  User,
  Mail,
  Palette,
  Bell,
  PenLine,
  Inbox,
  PanelRight,
  Tag,
  Keyboard,
  Info,
  Sun,
  Moon,
  Monitor,
  X,
  Plus,
  Trash2,
  Github,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useAuthStore } from '../../stores/auth-store';
import { Avatar } from '../ui/avatar';
import { DEFAULT_LABELS, type Label } from '../../lib/labels';
import { DEFAULT_SHORTCUTS, type ShortcutCategory } from '@atlasmail/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavItemId =
  | 'general'
  | 'accounts'
  | 'appearance'
  | 'notifications'
  | 'composer'
  | 'inbox'
  | 'reading-pane'
  | 'labels'
  | 'shortcuts'
  | 'about';

interface SidebarNavItem {
  id: NavItemId;
  label: string;
  icon: typeof User;
}

interface SidebarSection {
  title: string;
  items: SidebarNavItem[];
}

// ---------------------------------------------------------------------------
// Sidebar navigation config
// ---------------------------------------------------------------------------

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: 'Account',
    items: [
      { id: 'general', label: 'General', icon: User },
      { id: 'accounts', label: 'Accounts', icon: Mail },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'composer', label: 'Composer', icon: PenLine },
    ],
  },
  {
    title: 'Email',
    items: [
      { id: 'inbox', label: 'Inbox', icon: Inbox },
      { id: 'reading-pane', label: 'Reading pane', icon: PanelRight },
      { id: 'labels', label: 'Labels', icon: Tag },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard },
      { id: 'about', label: 'About', icon: Info },
    ],
  },
];

// ---------------------------------------------------------------------------
// Primitive UI components
// ---------------------------------------------------------------------------

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
      <div style={{ marginBottom: description ? 'var(--spacing-xs)' : 'var(--spacing-md)' }}>
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--line-height-normal)',
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

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-md) 0',
        borderBottom: '1px solid var(--color-border-secondary)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--font-size-md)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-family)',
            fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              marginTop: 2,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              lineHeight: 'var(--line-height-normal)',
            }}
          >
            {description}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SettingsToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 40,
        height: 22,
        borderRadius: 'var(--radius-full)',
        background: checked ? 'var(--color-accent-primary)' : 'var(--color-border-primary)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        transition: 'background var(--transition-normal)',
        flexShrink: 0,
        outline: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-border-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#ffffff',
          transition: 'left var(--transition-normal)',
          boxShadow: 'var(--shadow-sm)',
        }}
      />
    </button>
  );
}

function SelectableCard({
  selected,
  onClick,
  children,
  style,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-lg)',
        border: selected
          ? '2px solid var(--color-accent-primary)'
          : `2px solid ${hovered ? 'var(--color-border-primary)' : 'var(--color-border-secondary)'}`,
        background: selected
          ? 'color-mix(in srgb, var(--color-accent-primary) 8%, transparent)'
          : hovered
            ? 'var(--color-surface-hover)'
            : 'var(--color-bg-tertiary)',
        cursor: 'pointer',
        transition: 'border-color var(--transition-fast), background var(--transition-fast)',
        fontFamily: 'var(--font-family)',
        outline: 'none',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-border-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
}

function RadioOption({
  selected,
  onClick,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  description?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: selected
          ? 'color-mix(in srgb, var(--color-accent-primary) 8%, transparent)'
          : hovered
            ? 'var(--color-surface-hover)'
            : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background var(--transition-fast)',
        fontFamily: 'var(--font-family)',
        outline: 'none',
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-border-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: selected
            ? '5px solid var(--color-accent-primary)'
            : '2px solid var(--color-border-primary)',
          background: 'transparent',
          transition: 'border var(--transition-fast)',
          boxSizing: 'border-box',
        }}
      />
      <div>
        <div
          style={{
            fontSize: 'var(--font-size-md)',
            color: selected ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
            fontWeight: selected
              ? ('var(--font-weight-medium)' as CSSProperties['fontWeight'])
              : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              marginTop: 2,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {description}
          </div>
        )}
      </div>
    </button>
  );
}

function KeyBadge({ children }: { children: string }) {
  const keys = children.split('+');
  return (
    <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {keys.map((k, i) => (
        <kbd
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 20,
            padding: '0 5px',
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-secondary)',
            boxShadow: '0 1px 0 var(--color-border-primary)',
            lineHeight: 1,
          }}
        >
          {k === 'mod' ? '⌘' : k === 'shift' ? '⇧' : k}
        </kbd>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Density preview illustration
// ---------------------------------------------------------------------------

function DensityPreview({ density }: { density: 'compact' | 'default' | 'comfortable' }) {
  const gaps: Record<typeof density, number> = { compact: 3, default: 6, comfortable: 10 };
  const gap = gaps[density];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        width: 48,
        padding: '6px 4px',
      }}
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            height: 3,
            borderRadius: 2,
            background:
              i === 1
                ? 'var(--color-accent-primary)'
                : 'var(--color-border-primary)',
            opacity: i === 1 ? 1 : i === 2 ? 0.6 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reading pane preview illustration
// ---------------------------------------------------------------------------

function ReadingPanePreview({ position }: { position: 'right' | 'bottom' | 'hidden' }) {
  const baseStyle: CSSProperties = {
    width: 52,
    height: 36,
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border-primary)',
    overflow: 'hidden',
    display: 'flex',
  };

  if (position === 'right') {
    return (
      <div style={baseStyle}>
        <div
          style={{
            flex: 1,
            background: 'var(--color-bg-tertiary)',
            borderRight: '1px solid var(--color-border-primary)',
          }}
        />
        <div style={{ flex: 1.5, background: 'var(--color-bg-secondary)' }} />
      </div>
    );
  }

  if (position === 'bottom') {
    return (
      <div style={{ ...baseStyle, flexDirection: 'column' }}>
        <div
          style={{
            flex: 1,
            background: 'var(--color-bg-tertiary)',
            borderBottom: '1px solid var(--color-border-primary)',
          }}
        />
        <div style={{ flex: 1.5, background: 'var(--color-bg-secondary)' }} />
      </div>
    );
  }

  return (
    <div style={baseStyle}>
      <div style={{ flex: 1, background: 'var(--color-bg-tertiary)' }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: General
// ---------------------------------------------------------------------------

function GeneralPanel() {
  const account = useAuthStore((s) => s.account);
  const [displayName, setDisplayName] = useState(account?.name ?? '');

  return (
    <div>
      <SettingsSection title="Profile">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-lg)',
            padding: 'var(--spacing-lg)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--spacing-md)',
            border: '1px solid var(--color-border-secondary)',
          }}
        >
          <Avatar
            src={account?.pictureUrl}
            name={account?.name}
            email={account?.email ?? ''}
            size={48}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 'var(--font-size-md)',
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {account?.name || 'No name set'}
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {account?.email}
            </div>
          </div>
        </div>

        <SettingsRow label="Display name" description="How your name appears when you send emails">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            style={{
              width: 200,
              height: 32,
              padding: '0 var(--spacing-sm)',
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-border-focus)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-primary)')}
          />
        </SettingsRow>

        <SettingsRow label="Email address" description="Your Google account email">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 32,
              padding: '0 var(--spacing-sm)',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              userSelect: 'none',
              minWidth: 200,
            }}
          >
            {account?.email || '—'}
          </div>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Accounts
// ---------------------------------------------------------------------------

function AccountsPanel() {
  const account = useAuthStore((s) => s.account);

  return (
    <div>
      <SettingsSection title="Connected accounts">
        {account ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              background: 'var(--color-bg-tertiary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-secondary)',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            <Avatar
              src={account.pictureUrl}
              name={account.name}
              email={account.email}
              size={36}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {account.name || account.email}
              </div>
              <div
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {account.email}
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-success)',
                fontFamily: 'var(--font-family)',
                fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
              }}
            >
              <CheckCircle2 size={12} />
              Active
            </span>
          </div>
        ) : (
          <div
            style={{
              padding: 'var(--spacing-lg)',
              textAlign: 'center',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
            }}
          >
            No accounts connected
          </div>
        )}

        <button
          disabled
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            background: 'transparent',
            border: '1px dashed var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--font-size-md)',
            fontFamily: 'var(--font-family)',
            cursor: 'not-allowed',
            width: '100%',
            opacity: 0.6,
          }}
        >
          <Plus size={14} />
          Add account
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              background: 'var(--color-bg-tertiary)',
              padding: '1px 6px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border-secondary)',
            }}
          >
            Coming soon
          </span>
        </button>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Appearance
// ---------------------------------------------------------------------------

function AppearancePanel() {
  const { theme, density, setTheme, setDensity } = useSettingsStore();

  const themeOptions: Array<{ value: typeof theme; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const densityOptions: Array<{ value: typeof density; label: string }> = [
    { value: 'compact', label: 'Compact' },
    { value: 'default', label: 'Default' },
    { value: 'comfortable', label: 'Comfortable' },
  ];

  return (
    <div>
      <SettingsSection
        title="Theme"
        description="Choose the color scheme for the interface"
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <SelectableCard
              key={value}
              selected={theme === value}
              onClick={() => setTheme(value)}
              style={{ flex: 1, minHeight: 72 }}
            >
              <Icon
                size={20}
                style={{
                  color: theme === value ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                }}
              />
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                  color: theme === value ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {label}
              </span>
            </SelectableCard>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Density"
        description="Control the spacing of email list items"
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {densityOptions.map(({ value, label }) => (
            <SelectableCard
              key={value}
              selected={density === value}
              onClick={() => setDensity(value)}
              style={{ flex: 1, minHeight: 80, gap: 'var(--spacing-xs)' }}
            >
              <DensityPreview density={value} />
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                  color: density === value ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {label}
              </span>
            </SelectableCard>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Notifications
// ---------------------------------------------------------------------------

function NotificationsPanel() {
  const {
    desktopNotifications,
    soundNotifications,
    showBadgeCount,
    notificationLevel,
    setDesktopNotifications,
    setSoundNotifications,
    setShowBadgeCount,
    setNotificationLevel,
  } = useSettingsStore();

  const levels: Array<{
    value: typeof notificationLevel;
    label: string;
    description: string;
  }> = [
    { value: 'all', label: 'All', description: 'Notify for every new email' },
    { value: 'smart', label: 'Smart', description: 'Notify for important emails only' },
    { value: 'priority', label: 'Priority', description: 'Notify only for starred senders' },
    { value: 'none', label: 'None', description: 'No notifications' },
  ];

  return (
    <div>
      <SettingsSection title="Alerts">
        <SettingsRow
          label="Desktop notifications"
          description="Show system notifications for new email"
        >
          <SettingsToggle
            checked={desktopNotifications}
            onChange={setDesktopNotifications}
            label="Desktop notifications"
          />
        </SettingsRow>

        <SettingsRow
          label="Sound notifications"
          description="Play a sound when new email arrives"
        >
          <SettingsToggle
            checked={soundNotifications}
            onChange={setSoundNotifications}
            label="Sound notifications"
          />
        </SettingsRow>

        <SettingsRow
          label="Show badge count"
          description="Display unread count on the app icon"
        >
          <SettingsToggle
            checked={showBadgeCount}
            onChange={setShowBadgeCount}
            label="Show badge count"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Notification level"
        description="Choose which emails trigger notifications"
      >
        <div
          role="radiogroup"
          aria-label="Notification level"
          style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {levels.map(({ value, label, description }) => (
            <RadioOption
              key={value}
              selected={notificationLevel === value}
              onClick={() => setNotificationLevel(value)}
              label={label}
              description={description}
            />
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Composer
// ---------------------------------------------------------------------------

function ComposerPanel() {
  const {
    composeMode,
    signature,
    undoSendDelay,
    setComposeMode,
    setSignature,
    setUndoSendDelay,
  } = useSettingsStore();

  return (
    <div>
      <SettingsSection title="Compose mode">
        <div
          role="radiogroup"
          aria-label="Compose mode"
          style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <RadioOption
            selected={composeMode === 'rich'}
            onClick={() => setComposeMode('rich')}
            label="Rich text"
            description="Bold, italic, links, and more"
          />
          <RadioOption
            selected={composeMode === 'plain'}
            onClick={() => setComposeMode('plain')}
            label="Plain text"
            description="Simple unformatted text"
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Email signature"
        description="Automatically appended to every email you compose"
      >
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Add a signature..."
          rows={4}
          style={{
            width: '100%',
            padding: 'var(--spacing-sm)',
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-md)',
            fontFamily: 'var(--font-family)',
            lineHeight: 'var(--line-height-normal)',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color var(--transition-fast)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-border-focus)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-primary)')}
        />
      </SettingsSection>

      <SettingsSection title="Undo send">
        <SettingsRow
          label="Undo send delay"
          description="How long you have to cancel a sent email"
        >
          <select
            value={undoSendDelay}
            onChange={(e) => setUndoSendDelay(Number(e.target.value) as 5 | 10 | 30)}
            style={{
              height: 32,
              padding: '0 var(--spacing-sm)',
              paddingRight: 28,
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
            }}
          >
            <option value={5}>5 seconds</option>
            <option value={10}>10 seconds</option>
            <option value={30}>30 seconds</option>
          </select>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Inbox
// ---------------------------------------------------------------------------

function InboxPanel() {
  const { autoAdvance, setAutoAdvance } = useSettingsStore();

  const options: Array<{
    value: typeof autoAdvance;
    label: string;
    description: string;
  }> = [
    {
      value: 'next',
      label: 'Next conversation',
      description: 'Advance to the next email after archiving or deleting',
    },
    {
      value: 'previous',
      label: 'Previous conversation',
      description: 'Go back to the previous email',
    },
    {
      value: 'list',
      label: 'Return to list',
      description: 'Always return to the inbox list',
    },
  ];

  return (
    <div>
      <SettingsSection
        title="Auto-advance"
        description="What happens after you archive, trash, or complete an action on an email"
      >
        <div
          role="radiogroup"
          aria-label="Auto-advance behavior"
          style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {options.map(({ value, label, description }) => (
            <RadioOption
              key={value}
              selected={autoAdvance === value}
              onClick={() => setAutoAdvance(value)}
              label={label}
              description={description}
            />
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Reading pane
// ---------------------------------------------------------------------------

function ReadingPanePanel() {
  const { readingPane, setReadingPane } = useSettingsStore();

  const positions: Array<{
    value: typeof readingPane;
    label: string;
    description: string;
  }> = [
    { value: 'right', label: 'Right', description: 'Show reading pane to the right' },
    { value: 'bottom', label: 'Bottom', description: 'Show reading pane below' },
    { value: 'hidden', label: 'Hidden', description: 'Hide the reading pane' },
  ];

  return (
    <div>
      <SettingsSection
        title="Layout"
        description="Choose where the reading pane is displayed"
      >
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          {positions.map(({ value, label }) => (
            <SelectableCard
              key={value}
              selected={readingPane === value}
              onClick={() => setReadingPane(value)}
              style={{ flex: 1, minHeight: 90, gap: 'var(--spacing-sm)' }}
            >
              <ReadingPanePreview position={value} />
              <span
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
                  color:
                    readingPane === value
                      ? 'var(--color-accent-primary)'
                      : 'var(--color-text-secondary)',
                }}
              >
                {label}
              </span>
            </SelectableCard>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Labels
// ---------------------------------------------------------------------------

function LabelsPanel() {
  const [labels, setLabels] = useState<Label[]>(DEFAULT_LABELS);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');

  function addLabel() {
    const trimmed = newLabelName.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/\s+/g, '-');
    setLabels((prev) => [...prev, { id, name: trimmed, color: newLabelColor }]);
    setNewLabelName('');
  }

  function removeLabel(id: string) {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div>
      <SettingsSection title="Your labels" description="Custom labels to organize your email">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            marginBottom: 'var(--spacing-md)',
          }}
        >
          {labels.map((label) => (
            <div
              key={label.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border-secondary)',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: label.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  flex: 1,
                  fontSize: 'var(--font-size-md)',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {label.name}
              </span>
              <button
                onClick={() => removeLabel(label.id)}
                aria-label={`Remove ${label.name} label`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  padding: 0,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  transition: 'color var(--transition-fast), background var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-error)';
                  e.currentTarget.style.background = 'var(--color-surface-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-tertiary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            alignItems: 'center',
            padding: 'var(--spacing-sm)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-secondary)',
          }}
        >
          <input
            type="color"
            value={newLabelColor}
            onChange={(e) => setNewLabelColor(e.target.value)}
            aria-label="Label color"
            style={{
              width: 28,
              height: 28,
              padding: 2,
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          />
          <input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name..."
            onKeyDown={(e) => e.key === 'Enter' && addLabel()}
            style={{
              flex: 1,
              height: 28,
              padding: '0 var(--spacing-sm)',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-border-focus)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-primary)')}
          />
          <button
            onClick={addLabel}
            disabled={!newLabelName.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              height: 28,
              padding: '0 var(--spacing-sm)',
              background: newLabelName.trim()
                ? 'var(--color-accent-primary)'
                : 'var(--color-bg-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: newLabelName.trim() ? '#ffffff' : 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
              cursor: newLabelName.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'background var(--transition-fast)',
            }}
          >
            <Plus size={13} />
            Add
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Keyboard shortcuts
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: 'Navigation',
  actions: 'Actions',
  compose: 'Compose',
  search: 'Search',
  ui: 'Interface',
};

function ShortcutsPanel() {
  const categories: ShortcutCategory[] = ['navigation', 'actions', 'compose', 'search', 'ui'];

  return (
    <div>
      {categories.map((category) => {
        const shortcuts = DEFAULT_SHORTCUTS.filter((s) => s.category === category);
        if (shortcuts.length === 0) return null;

        return (
          <SettingsSection key={category} title={CATEGORY_LABELS[category]}>
            <div
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-secondary)',
                overflow: 'hidden',
              }}
            >
              {shortcuts.map((shortcut, index) => (
                <div
                  key={shortcut.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--spacing-lg)',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background:
                      index % 2 === 0 ? 'var(--color-bg-tertiary)' : 'transparent',
                    borderBottom:
                      index < shortcuts.length - 1
                        ? '1px solid var(--color-border-secondary)'
                        : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 'var(--font-size-md)',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-family)',
                      }}
                    >
                      {shortcut.label}
                    </div>
                    <div
                      style={{
                        marginTop: 1,
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        fontFamily: 'var(--font-family)',
                      }}
                    >
                      {shortcut.description}
                    </div>
                  </div>
                  <KeyBadge>{shortcut.keys}</KeyBadge>
                </div>
              ))}
            </div>
          </SettingsSection>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: About
// ---------------------------------------------------------------------------

function AboutPanel() {
  return (
    <div>
      <SettingsSection title="About AtlasMail">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-lg)',
            padding: 'var(--spacing-lg)',
            background: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border-secondary)',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Mail size={24} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              AtlasMail
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-family)',
              }}
            >
              Version 0.1.0
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
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-secondary)',
            }}
          >
            0.1.0
          </span>
        </SettingsRow>

        <SettingsRow label="Built with" description="Technologies used">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {['React', 'TypeScript', 'Vite', 'Zustand'].map((tech) => (
              <span
                key={tech}
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-bg-tertiary)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-border-secondary)',
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Links">
        {[
          { label: 'View on GitHub', icon: Github, href: '#' },
          { label: 'Report an issue', icon: AlertCircle, href: '#' },
        ].map(({ label, icon: Icon, href }) => (
          <a
            key={label}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--spacing-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              marginBottom: 4,
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border-secondary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-link)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
              textDecoration: 'none',
              transition: 'background var(--transition-fast)',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background =
                'var(--color-surface-hover)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background =
                'var(--color-bg-tertiary)')
            }
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <Icon size={14} />
              {label}
            </span>
            <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)' }} />
          </a>
        ))}
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel map
// ---------------------------------------------------------------------------

const PANELS: Record<NavItemId, () => ReactElement> = {
  general: GeneralPanel,
  accounts: AccountsPanel,
  appearance: AppearancePanel,
  notifications: NotificationsPanel,
  composer: ComposerPanel,
  inbox: InboxPanel,
  'reading-pane': ReadingPanePanel,
  labels: LabelsPanel,
  shortcuts: ShortcutsPanel,
  about: AboutPanel,
};

const PANEL_TITLES: Record<NavItemId, string> = {
  general: 'General',
  accounts: 'Accounts',
  appearance: 'Appearance',
  notifications: 'Notifications',
  composer: 'Composer',
  inbox: 'Inbox',
  'reading-pane': 'Reading pane',
  labels: 'Labels',
  shortcuts: 'Keyboard shortcuts',
  about: 'About',
};

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export function SettingsModal() {
  const { settingsOpen, closeSettings } = useUIStore();
  const [activeItem, setActiveItem] = useState<NavItemId>('general');

  const ActivePanel = PANELS[activeItem];

  return (
    <Dialog.Root open={settingsOpen} onOpenChange={(open) => !open && closeSettings()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--color-bg-overlay)',
            zIndex: 200,
            animation: 'fadeIn 150ms ease',
          }}
        />

        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 720,
            maxWidth: 'calc(100vw - 32px)',
            height: 520,
            maxHeight: '80vh',
            background: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-elevated)',
            display: 'flex',
            overflow: 'hidden',
            zIndex: 201,
            animation: 'scaleIn 150ms ease',
          }}
        >
          <VisuallyHidden.Root>
            <Dialog.Title>Settings</Dialog.Title>
          </VisuallyHidden.Root>

          {/* Left sidebar */}
          <div
            style={{
              width: 200,
              flexShrink: 0,
              background: 'var(--color-bg-secondary)',
              borderRight: '1px solid var(--color-border-primary)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: 'var(--spacing-md) var(--spacing-sm)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                padding: 'var(--spacing-xs) var(--spacing-sm)',
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                Settings
              </span>
            </div>

            {SIDEBAR_SECTIONS.map((section, si) => (
              <div
                key={section.title}
                style={{ marginBottom: si < SIDEBAR_SECTIONS.length - 1 ? 'var(--spacing-md)' : 0 }}
              >
                <div
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-family)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 2,
                  }}
                >
                  {section.title}
                </div>

                {section.items.map(({ id, label, icon: Icon }) => {
                  const isActive = activeItem === id;
                  return (
                    <SidebarNavButton
                      key={id}
                      isActive={isActive}
                      onClick={() => setActiveItem(id)}
                      label={label}
                      icon={<Icon size={15} />}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right content area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Content header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--spacing-md) var(--spacing-xl)',
                borderBottom: '1px solid var(--color-border-primary)',
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {PANEL_TITLES[activeItem]}
              </h2>

              <Dialog.Close asChild>
                <button
                  aria-label="Close settings"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-text-tertiary)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast), color var(--transition-fast)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface-hover)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                  }}
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            {/* Scrollable content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--spacing-xl)',
                boxSizing: 'border-box',
              }}
            >
              <ActivePanel />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------
// Sidebar nav button (extracted to keep hover state isolated)
// ---------------------------------------------------------------------------

function SidebarNavButton({
  isActive,
  onClick,
  label,
  icon,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-current={isActive ? 'page' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: 'var(--spacing-xs) var(--spacing-sm)',
        background: isActive
          ? 'var(--color-surface-selected)'
          : hovered
            ? 'var(--color-surface-hover)'
            : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family)',
        fontWeight: isActive
          ? ('var(--font-weight-medium)' as CSSProperties['fontWeight'])
          : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background var(--transition-fast), color var(--transition-fast)',
        outline: 'none',
        marginBottom: 1,
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-border-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          color: isActive ? 'var(--color-accent-primary)' : 'currentColor',
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
