import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useMyTenants, useCreateTenant } from '../../hooks/use-platform';
import { ROUTES } from '../../config/routes';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

// ---------------------------------------------------------------------------
// Nav config
// ---------------------------------------------------------------------------

const NAV_ITEMS: NavItem[] = [
  { to: ROUTES.ORG, label: 'Overview', icon: <LayoutDashboard size={16} />, end: true },
  { to: ROUTES.ORG_MEMBERS, label: 'Members', icon: <Users size={16} /> },
  { to: ROUTES.ORG_SETTINGS, label: 'Settings', icon: <Settings size={16} /> },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPageTitle(pathname: string): string {
  if (pathname === ROUTES.ORG) return 'Overview';
  if (pathname.startsWith(ROUTES.ORG_MEMBERS)) return 'Members';
  if (pathname.startsWith(ROUTES.ORG_SETTINGS)) return 'Settings';
  return 'Organization';
}

// ---------------------------------------------------------------------------
// OrgLayout
// ---------------------------------------------------------------------------

export function OrgLayout() {
  const tenantId = useAuthStore((s) => s.tenantId);
  const { data: tenants, isLoading: tenantsLoading } = useMyTenants();
  const activeTenant = tenants?.[0];
  const hasTenant = !!tenantId || !!activeTenant;
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (tenantsLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-family)', color: 'var(--color-text-secondary)' }}>
        Loading...
      </div>
    );
  }

  if (!hasTenant) {
    return <CreateOrgPrompt />;
  }

  const pageTitle = getPageTitle(pathname);

  // -------------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------------

  const shellStyle: CSSProperties = {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: 'var(--font-family)',
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-text-primary)',
  };

  const sidebarStyle: CSSProperties = {
    width: 240,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--color-bg-primary)',
    borderRight: '1px solid var(--color-border-primary)',
  };

  const sidebarHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-lg)',
    borderBottom: '1px solid var(--color-border-secondary)',
    minHeight: 56,
  };

  const iconWrapStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 'var(--radius-sm)',
    background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
    color: 'var(--color-accent-primary)',
    flexShrink: 0,
  };

  const logoTextStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    overflow: 'hidden',
  };

  const logoTitleStyle: CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
    color: 'var(--color-text-primary)',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const logoSubtitleStyle: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-tertiary)',
    lineHeight: 1.3,
    whiteSpace: 'nowrap',
  };

  const navStyle: CSSProperties = {
    flex: 1,
    overflow: 'hidden',
  };

  const navInnerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 'var(--spacing-sm)',
  };

  const sidebarFooterStyle: CSSProperties = {
    padding: 'var(--spacing-md)',
    borderTop: '1px solid var(--color-border-secondary)',
  };

  const contentAreaStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  };

  const topBarStyle: CSSProperties = {
    height: 56,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: '0 var(--spacing-xl)',
    borderBottom: '1px solid var(--color-border-primary)',
    background: 'var(--color-bg-primary)',
  };

  const breadcrumbLabelStyle: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-tertiary)',
    fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
  };

  const breadcrumbSepStyle: CSSProperties = {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-tertiary)',
    userSelect: 'none',
  };

  const pageTitleStyle: CSSProperties = {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
    color: 'var(--color-text-primary)',
  };

  const mainStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--spacing-xl)',
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div style={shellStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        {/* Header */}
        <div style={sidebarHeaderStyle}>
          <div style={iconWrapStyle}>
            <Building2 size={16} strokeWidth={2} />
          </div>
          <div style={logoTextStyle}>
            <span style={logoTitleStyle}>{activeTenant?.name ?? 'Organization'}</span>
            <span style={logoSubtitleStyle}>Organization settings</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={navStyle} aria-label="Organization navigation">
          <ScrollArea>
            <div style={navInnerStyle}>
              {NAV_ITEMS.map((item) => (
                <NavLinkItem key={item.to} item={item} />
              ))}
            </div>
          </ScrollArea>
        </nav>

        {/* Footer — back to home */}
        <div style={sidebarFooterStyle}>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={14} />}
            onClick={() => navigate(ROUTES.HOME)}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            Back to home
          </Button>
        </div>
      </aside>

      {/* Content area */}
      <div style={contentAreaStyle}>
        {/* Top bar */}
        <header style={topBarStyle}>
          <span style={breadcrumbLabelStyle}>Organization</span>
          <span style={breadcrumbSepStyle}>/</span>
          <span style={pageTitleStyle}>{pageTitle}</span>
        </header>

        {/* Page content */}
        <main style={mainStyle}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavLinkItem
// ---------------------------------------------------------------------------

function NavLinkItem({ item }: { item: NavItem }) {
  const baseItemStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: '0 var(--spacing-sm)',
    height: 34,
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-normal)' as CSSProperties['fontWeight'],
    textDecoration: 'none',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
    cursor: 'pointer',
    userSelect: 'none',
    borderLeft: '2px solid transparent',
    boxSizing: 'border-box',
  };

  return (
    <NavLink
      to={item.to}
      end={item.end ?? false}
      style={({ isActive }) => ({
        ...baseItemStyle,
        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        background: isActive ? 'var(--color-surface-active)' : 'transparent',
        borderLeft: isActive
          ? '2px solid var(--color-accent-primary)'
          : '2px solid transparent',
        fontWeight: isActive
          ? ('var(--font-weight-medium)' as CSSProperties['fontWeight'])
          : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
      })}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (!el.getAttribute('aria-current')) {
          el.style.background = 'var(--color-surface-hover)';
          el.style.color = 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (!el.getAttribute('aria-current')) {
          el.style.background = 'transparent';
          el.style.color = 'var(--color-text-secondary)';
        }
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          opacity: 0.8,
        }}
        aria-hidden="true"
      >
        {item.icon}
      </span>
      {item.label}
    </NavLink>
  );
}

// ---------------------------------------------------------------------------
// CreateOrgPrompt — shown when user has no tenant
// ---------------------------------------------------------------------------

function CreateOrgPrompt() {
  const navigate = useNavigate();
  const createTenant = useCreateTenant();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createTenant.mutateAsync({ name, slug });
      // After creating, reload the page to pick up the new tenant
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create organization');
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-bg-secondary)',
      fontFamily: 'var(--font-family)',
    }}>
      <div style={{
        width: 440,
        padding: 32,
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-primary)',
        borderRadius: 12,
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
          color: 'var(--color-accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Building2 size={24} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          Create your organization
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
          Organizations let you manage team members. Create one to get started.
        </p>

        {error && (
          <div style={{ padding: '8px 12px', marginBottom: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 4, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <Input
              label="Organization name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                // Auto-generate slug from name
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
              }}
              required
              placeholder="Acme Corp"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <Input
              label="URL slug"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              required
              placeholder="acme-corp"
              pattern="[a-z0-9][a-z0-9\-]*[a-z0-9]"
            />
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              Lowercase letters, numbers, and hyphens only.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(ROUTES.HOME)}
              style={{ flex: 1 }}
            >
              Back to home
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createTenant.isPending}
              style={{ flex: 1 }}
            >
              {createTenant.isPending ? 'Creating...' : 'Create organization'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
