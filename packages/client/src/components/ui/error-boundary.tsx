/**
 * Error boundary and query error fallback components.
 *
 * Usage:
 *   // Wrap any subtree to catch render errors:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 *   // For TanStack Query errors, pass as the fallback render prop:
 *   const { data, error, refetch } = useQuery(...);
 *   if (error) return <QueryErrorFallback error={error} refetch={refetch} />;
 */

import { Component, type CSSProperties, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

// ─── Shared error UI ──────────────────────────────────────────────────

interface ErrorDisplayProps {
  message: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; href: string };
}

function ErrorDisplay({ message, primaryAction, secondaryAction }: ErrorDisplayProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: 240,
    gap: 'var(--spacing-md)',
    padding: 'var(--spacing-xl)',
    fontFamily: 'var(--font-family)',
    textAlign: 'center',
  };

  const iconWrapperStyle: CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: 'var(--radius-xl)',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 'var(--spacing-xs)',
  };

  const headingStyle: CSSProperties = {
    margin: 0,
    fontSize: 'var(--font-size-lg)',
    fontWeight: 'var(--font-weight-semibold)' as CSSProperties['fontWeight'],
    color: 'var(--color-text-primary)',
    lineHeight: 'var(--line-height-tight)',
  };

  const messageStyle: CSSProperties = {
    margin: 0,
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-text-tertiary)',
    lineHeight: 'var(--line-height-normal)',
    maxWidth: 360,
  };

  const actionsStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    marginTop: 'var(--spacing-xs)',
    flexWrap: 'wrap',
    justifyContent: 'center',
  };

  const primaryButtonStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    padding: '0 var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border-primary)',
    background: 'var(--color-bg-elevated)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-md)',
    fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
    fontFamily: 'var(--font-family)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
    whiteSpace: 'nowrap',
  };

  const secondaryLinkStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    padding: '0 var(--spacing-md)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: 'var(--font-size-md)',
    fontFamily: 'var(--font-family)',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background var(--transition-fast), color var(--transition-fast)',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle} role="alert">
      <div style={iconWrapperStyle}>
        <AlertTriangle size={22} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>

      <h2 style={headingStyle}>Something went wrong</h2>
      <p style={messageStyle}>{message}</p>

      <div style={actionsStyle}>
        <button
          onClick={primaryAction.onClick}
          style={primaryButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-bg-elevated)';
          }}
        >
          {primaryAction.label}
        </button>

        {secondaryAction && (
          <a
            href={secondaryAction.href}
            style={secondaryLinkStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-surface-hover)';
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            {secondaryAction.label}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── ErrorBoundary class component ───────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected error occurred. Please try again.';
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    // Log to console in dev; swap for an error-reporting service in production.
    console.error('[ErrorBoundary] Caught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          message={this.state.errorMessage}
          primaryAction={{ label: 'Try again', onClick: this.handleReset }}
          secondaryAction={{ label: 'Reload page', href: window.location.href }}
        />
      );
    }

    return this.props.children;
  }
}

// ─── QueryErrorFallback ───────────────────────────────────────────────

interface QueryErrorFallbackProps {
  error: unknown;
  refetch: () => void;
}

export function QueryErrorFallback({ error, refetch }: QueryErrorFallbackProps) {
  const message =
    error instanceof Error
      ? error.message
      : 'Failed to load data. Check your connection and try again.';

  return (
    <ErrorDisplay
      message={message}
      primaryAction={{ label: 'Retry', onClick: refetch }}
      secondaryAction={{ label: 'Reload page', href: window.location.href }}
    />
  );
}
