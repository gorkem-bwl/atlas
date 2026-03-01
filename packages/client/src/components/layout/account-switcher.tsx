import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, Plus, LogOut, Check } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { Avatar } from '../ui/avatar';
import type { Account } from '@atlasmail/shared';
import type { CSSProperties } from 'react';
import { AddAccountModal } from '../settings/add-account-modal';
import { ConfirmDialog } from '../ui/confirm-dialog';

// ─── Sync status dot ────────────────────────────────────────────────────────

function SyncDot({ status }: { status: Account['syncStatus'] }) {
  const base: CSSProperties = {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
    position: 'relative',
  };

  if (status === 'syncing') {
    return (
      <>
        <style>{`
          @keyframes am-spin { to { transform: rotate(360deg); } }
        `}</style>
        <span
          aria-label="Syncing"
          style={{
            ...base,
            border: '1.5px solid transparent',
            borderTopColor: 'var(--color-accent-primary)',
            borderRightColor: 'var(--color-accent-primary)',
            background: 'transparent',
            animation: 'am-spin 0.8s linear infinite',
          }}
        />
      </>
    );
  }

  const color =
    status === 'idle' ? '#22c55e' : status === 'error' ? '#ef4444' : 'var(--color-text-tertiary)';

  return <span aria-label={status} style={{ ...base, background: color }} />;
}

// ─── Account row inside the dropdown ────────────────────────────────────────

function AccountRow({
  account,
  isActive,
  onSwitch,
  onRemove,
}: {
  account: Account;
  isActive: boolean;
  onSwitch: () => void;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        background: hovered ? 'var(--color-surface-hover)' : 'transparent',
        transition: 'background var(--transition-normal)',
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSwitch}
      role="menuitem"
      aria-current={isActive ? true : undefined}
    >
      {/* Avatar with sync dot overlay */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar src={account.pictureUrl} name={account.name} email={account.email} size={28} />
        <span
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SyncDot status={account.syncStatus} />
        </span>
      </div>

      {/* Name + email */}
      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
            color: 'var(--color-text-primary)',
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

      {/* Active check OR remove button on hover */}
      {isActive ? (
        <Check size={14} style={{ color: 'var(--color-accent-primary)', flexShrink: 0 }} />
      ) : hovered ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove account ${account.email}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            padding: 0,
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'color var(--transition-normal)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-tertiary)';
          }}
        >
          <LogOut size={13} />
        </button>
      ) : (
        <span style={{ width: 22, flexShrink: 0 }} />
      )}
    </div>
  );
}

// ─── AccountSwitcher ─────────────────────────────────────────────────────────

export function AccountSwitcher() {
  const { account, accounts, switchAccount, removeAccount, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [triggerHovered, setTriggerHovered] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleAddAccount = useCallback(() => {
    setOpen(false);
    setShowAddModal(true);
  }, []);

  const handleSwitch = useCallback(
    (accountId: string) => {
      switchAccount(accountId);
      setOpen(false);
    },
    [switchAccount],
  );

  const handleRemove = useCallback(
    (accountId: string) => {
      setOpen(false);
      setConfirmRemoveId(accountId);
    },
    [],
  );

  const executeRemove = useCallback(
    (accountId: string) => {
      const isActive = account?.id === accountId;
      if (isActive && accounts.length <= 1) {
        logout();
      } else {
        removeAccount(accountId);
      }
    },
    [account, accounts.length, logout, removeAccount],
  );

  if (!account) return null;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Dropdown panel — rendered above the trigger */}
      {open && (
        <div
          role="menu"
          aria-label="Account switcher"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-primary)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-elevated)',
            overflow: 'hidden',
            zIndex: 200,
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Account list */}
          {accounts.map((acc) => (
            <AccountRow
              key={acc.id}
              account={acc}
              isActive={acc.id === account.id}
              onSwitch={() => handleSwitch(acc.id)}
              onRemove={() => handleRemove(acc.id)}
            />
          ))}

          {/* Divider */}
          <div
            aria-hidden="true"
            style={{
              height: 1,
              background: 'var(--color-border-primary)',
              margin: '4px 0',
            }}
          />

          {/* Sign out */}
          <SignOutButton onClick={() => { setOpen(false); logout(); }} />

          {/* Add account */}
          <AddAccountButton onClick={handleAddAccount} />
        </div>
      )}

      {/* Trigger row */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Active account: ${account.email}. Click to switch accounts.`}
        onMouseEnter={() => setTriggerHovered(true)}
        onMouseLeave={() => setTriggerHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          width: '100%',
          padding: '8px var(--spacing-md)',
          background: triggerHovered ? 'var(--color-surface-hover)' : 'transparent',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          transition: 'background var(--transition-normal)',
          textAlign: 'left',
          fontFamily: 'var(--font-family)',
        }}
      >
        {/* Active account avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar src={account.pictureUrl} name={account.name} email={account.email} size={26} />
          {accounts.length > 1 && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontWeight: 700,
                color: 'var(--color-text-secondary)',
              }}
            >
              {accounts.length}
            </span>
          )}
        </div>

        {/* Name + email */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <div
            style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
              color: 'var(--color-text-primary)',
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

        <ChevronUp
          size={14}
          style={{
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--transition-normal)',
          }}
        />
      </button>

      {confirmRemoveId && (
        <ConfirmDialog
          open={!!confirmRemoveId}
          onOpenChange={(open) => { if (!open) setConfirmRemoveId(null); }}
          title="Remove account?"
          description={`This will disconnect "${accounts.find((a) => a.id === confirmRemoveId)?.email}" from Atlas. You can add it back later.`}
          confirmLabel="Remove account"
          onConfirm={() => executeRemove(confirmRemoveId)}
        />
      )}
      <AddAccountModal open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}

// ─── Sign out button ──────────────────────────────────────────────────────────

function SignOutButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      role="menuitem"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: '8px 12px',
        background: hovered ? 'var(--color-surface-hover)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family)',
        fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        cursor: 'pointer',
        transition: 'background var(--transition-normal), color var(--transition-normal)',
        textAlign: 'left',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <LogOut size={14} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
      Sign out
    </button>
  );
}

// ─── Add account button ───────────────────────────────────────────────────────

function AddAccountButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      role="menuitem"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        width: '100%',
        padding: '8px 12px',
        background: hovered ? 'var(--color-surface-hover)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--font-size-sm)',
        fontFamily: 'var(--font-family)',
        fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        cursor: 'pointer',
        transition: 'background var(--transition-normal), color var(--transition-normal)',
        textAlign: 'left',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1.5px dashed var(--color-border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Plus size={13} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
      Add account
    </button>
  );
}
