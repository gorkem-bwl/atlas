import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Building2,
  Globe,
  CreditCard,
  Calendar,
  Copy,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useMyTenants, useTenantUsers } from '../../hooks/use-platform';
import { Chip } from '../../components/ui/chip';
import { Skeleton } from '../../components/ui/skeleton';
import { IconButton } from '../../components/ui/icon-button';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const sectionStyle: CSSProperties = {
  background: 'var(--color-bg-primary)',
  border: '1px solid var(--color-border-primary)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
};

const sectionHeaderStyle: CSSProperties = {
  padding: 'var(--spacing-lg) var(--spacing-xl)',
  borderBottom: '1px solid var(--color-border-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-sm)',
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
  color: 'var(--color-text-primary)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: 'var(--spacing-md) var(--spacing-xl)',
  borderBottom: '1px solid var(--color-border-secondary)',
  gap: 'var(--spacing-md)',
  minHeight: 48,
};

const labelStyle: CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-secondary)',
  width: 160,
  flexShrink: 0,
  fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
};

const valueStyle: CSSProperties = {
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-primary)',
  flex: 1,
  minWidth: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const PLAN_COLORS: Record<string, string> = {
  starter: '#6b7280',
  pro: 'var(--color-accent-primary)',
  enterprise: '#7c3aed',
};

function PlanBadge({ plan }: { plan: string }) {
  const color = PLAN_COLORS[plan] ?? PLAN_COLORS.starter;
  return (
    <Chip
      color={color}
      height={20}
      style={{
        padding: '0 10px',
        fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
        textTransform: 'capitalize',
      }}
    >
      {plan}
    </Chip>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  const color = isActive ? 'var(--color-success, #16a34a)' : 'var(--color-error, #ef4444)';
  return (
    <Chip
      color={color}
      height={20}
      style={{
        padding: '0 10px',
        fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        textTransform: 'capitalize',
      }}
    >
      {status}
    </Chip>
  );
}

function CopyableValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
      <span
        style={{
          fontFamily: 'var(--font-family-mono, monospace)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-bg-secondary)',
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
          userSelect: 'all',
        }}
      >
        {value}
      </span>
      <IconButton
        icon={copied ? <Check size={13} /> : <Copy size={13} />}
        label={copied ? 'Copied' : 'Copy to clipboard'}
        size={24}
        tooltip
        tooltipSide="top"
        active={copied}
        activeColor="var(--color-success, #16a34a)"
        onClick={handleCopy}
      />
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div style={sectionStyle}>
      <div style={sectionHeaderStyle}>
        <Skeleton width={120} height={16} borderRadius="var(--radius-sm)" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ ...rowStyle, borderBottom: i < 3 ? rowStyle.borderBottom : 'none' }}>
          <Skeleton width={100} height={14} borderRadius="var(--radius-sm)" />
          <Skeleton width={180} height={14} borderRadius="var(--radius-sm)" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrgSettingsPage
// ---------------------------------------------------------------------------

export function OrgSettingsPage() {
  const storeTenantId = useAuthStore((s) => s.tenantId);
  const { data: tenants, isLoading: tenantsLoading } = useMyTenants();
  const tenant = tenants?.[0];
  const effectiveTenantId = storeTenantId ?? tenant?.id;

  const { data: users, isLoading: usersLoading } = useTenantUsers(effectiveTenantId ?? undefined);

  const isLoading = tenantsLoading || usersLoading;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
        <SkeletonBlock />
        <SkeletonBlock />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
        No organization found.
      </div>
    );
  }

  const memberCount = users?.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', maxWidth: 720 }}>
      {/* Organization profile */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <Building2 size={15} style={{ color: 'var(--color-text-tertiary)' }} />
          <span style={sectionTitleStyle}>Organization profile</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Name</span>
          <span style={valueStyle}>{tenant.name}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Slug</span>
          <div style={valueStyle}>
            <CopyableValue value={tenant.slug} />
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Organization ID</span>
          <div style={valueStyle}>
            <CopyableValue value={tenant.id} />
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Status</span>
          <div style={valueStyle}>
            <StatusBadge status={tenant.status} />
          </div>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Created</span>
          <span style={valueStyle}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />
              {formatDate(tenant.createdAt)}
            </span>
          </span>
        </div>
      </div>

      {/* Plan & billing */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <CreditCard size={15} style={{ color: 'var(--color-text-tertiary)' }} />
          <span style={sectionTitleStyle}>Plan & billing</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Current plan</span>
          <div style={valueStyle}>
            <PlanBadge plan={tenant.plan} />
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Team members</span>
          <span style={valueStyle}>{memberCount}</span>
        </div>
      </div>

      {/* Infrastructure */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <Globe size={15} style={{ color: 'var(--color-text-tertiary)' }} />
          <span style={sectionTitleStyle}>Infrastructure</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Namespace</span>
          <div style={valueStyle}>
            <CopyableValue value={tenant.k8sNamespace} />
          </div>
        </div>
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <span style={labelStyle}>Owner ID</span>
          <div style={valueStyle}>
            <CopyableValue value={tenant.ownerId} />
          </div>
        </div>
      </div>
    </div>
  );
}
