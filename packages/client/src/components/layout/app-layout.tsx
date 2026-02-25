import { useState, useCallback, type ReactNode, type CSSProperties } from 'react';
import { Menu, X } from 'lucide-react';
import { useUIStore } from '../../stores/ui-store';
import { useEmailStore } from '../../stores/email-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useMediaQuery } from '../../hooks/use-media-query';
import { Sidebar } from './sidebar';
import { ResizeHandle } from '../ui/resize-handle';
import { ConnectionBanner } from '../ui/connection-banner';

// ---- Constants ---------------------------------------------------------------

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 320;
const SIDEBAR_DEFAULT = 220;
const SIDEBAR_LS_KEY = 'atlasmail_sidebar_width';

const LIST_MIN = 280;
const LIST_MAX = 900;
const LIST_DEFAULT = 400;
const LIST_LS_KEY = 'atlasmail_list_width';

// Reading pane height when position is 'bottom'
const PANE_HEIGHT_MIN = 160;
const PANE_HEIGHT_MAX = 600;
const PANE_HEIGHT_DEFAULT = 280;
const PANE_HEIGHT_LS_KEY = 'atlasmail_list_height';

// ---- Helpers -----------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readStoredWidth(key: string, defaultValue: number): number {
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return parsed;
    }
  } catch {
    // localStorage may be unavailable in some environments
  }
  return defaultValue;
}

// ---- Component ---------------------------------------------------------------

interface AppLayoutProps {
  emailList: ReactNode;
  readingPane: ReactNode;
}

export function AppLayout({ emailList, readingPane }: AppLayoutProps) {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const readingPanePosition = useSettingsStore((s) => s.readingPane);
  const activeThreadId = useEmailStore((s) => s.activeThreadId);

  // Breakpoint detection
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Pane dimension state — lazily initialised from localStorage
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    clamp(readStoredWidth(SIDEBAR_LS_KEY, SIDEBAR_DEFAULT), SIDEBAR_MIN, SIDEBAR_MAX),
  );

  const [listWidth, setListWidth] = useState(() =>
    clamp(readStoredWidth(LIST_LS_KEY, LIST_DEFAULT), LIST_MIN, LIST_MAX),
  );

  // Used only when readingPanePosition === 'bottom'
  const [listHeight, setListHeight] = useState(() =>
    clamp(readStoredWidth(PANE_HEIGHT_LS_KEY, PANE_HEIGHT_DEFAULT), PANE_HEIGHT_MIN, PANE_HEIGHT_MAX),
  );

  // ---- Resize callbacks -------------------------------------------------------

  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth((prev) => clamp(prev + delta, SIDEBAR_MIN, SIDEBAR_MAX));
  }, []);

  const handleSidebarResizeEnd = useCallback(() => {
    setSidebarWidth((prev) => {
      const clamped = clamp(prev, SIDEBAR_MIN, SIDEBAR_MAX);
      try {
        localStorage.setItem(SIDEBAR_LS_KEY, String(clamped));
      } catch {
        // ignore
      }
      return clamped;
    });
  }, []);

  const handleListResize = useCallback((delta: number) => {
    setListWidth((prev) => clamp(prev + delta, LIST_MIN, LIST_MAX));
  }, []);

  const handleListResizeEnd = useCallback(() => {
    setListWidth((prev) => {
      const clamped = clamp(prev, LIST_MIN, LIST_MAX);
      try {
        localStorage.setItem(LIST_LS_KEY, String(clamped));
      } catch {
        // ignore
      }
      return clamped;
    });
  }, []);

  const handleListHeightResize = useCallback((delta: number) => {
    setListHeight((prev) => clamp(prev + delta, PANE_HEIGHT_MIN, PANE_HEIGHT_MAX));
  }, []);

  const handleListHeightResizeEnd = useCallback(() => {
    setListHeight((prev) => {
      const clamped = clamp(prev, PANE_HEIGHT_MIN, PANE_HEIGHT_MAX);
      try {
        localStorage.setItem(PANE_HEIGHT_LS_KEY, String(clamped));
      } catch {
        // ignore
      }
      return clamped;
    });
  }, []);

  // ---- Render -----------------------------------------------------------------

  const isBottom = readingPanePosition === 'bottom';
  const isHidden = readingPanePosition === 'hidden';
  const isRight = readingPanePosition === 'right';

  // On mobile: show reading pane full-width when a thread is active.
  // On tablet: sidebar is an overlay, list + reading pane are shown together.
  // On desktop: full three-column layout (same as before).
  // When reading pane is 'hidden', clicking an email shows it full-width (replacing the list).
  const showMobileList = isMobile && !activeThreadId;
  const showMobileReadingPane = isMobile && !!activeThreadId;
  const showHiddenPaneThread = isHidden && !!activeThreadId;

  // Hamburger button — shown on tablet and mobile
  const HamburgerButton = (
    <button
      aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      onClick={toggleSidebar}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 34,
        height: 34,
        flexShrink: 0,
        background: 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
        transition: 'background var(--transition-normal), color var(--transition-normal)',
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
      {sidebarOpen && isTablet ? <X size={18} /> : <Menu size={18} />}
    </button>
  );

  // Detect Electron desktop shell (set by preload script)
  const isDesktop = !!('atlasDesktop' in window);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <ConnectionBanner />
    <div
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Desktop: invisible drag strip across the full top of the window */}
      {isDesktop && (
        <div
          className="desktop-drag-region"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 38,
            zIndex: 60,
          }}
        />
      )}

      {/* Skip to main content — visually hidden, visible on keyboard focus */}
      <a href="#email-list-main" className="skip-link">
        Skip to main content
      </a>

      {/* ---- Desktop sidebar (inline) ---- */}
      {!isTablet && sidebarOpen && (
        <>
          <aside
            aria-label="Application sidebar"
            style={{
              width: `${sidebarWidth}px`,
              flexShrink: 0,
              height: '100%',
              background: 'var(--color-bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Sidebar />
          </aside>

          <ResizeHandle
            orientation="vertical"
            onResize={handleSidebarResize}
            onResizeEnd={handleSidebarResizeEnd}
          />
        </>
      )}

      {/* ---- Tablet / mobile overlay sidebar ---- */}
      {isTablet && (
        <>
          {/* Backdrop */}
          {sidebarOpen && (
            <div
              className="sidebar-overlay-backdrop is-open"
              onClick={toggleSidebar}
              aria-hidden="true"
            />
          )}

          {/* Overlay panel */}
          <aside
            aria-label="Application sidebar"
            className={`sidebar-overlay${sidebarOpen ? ' is-open' : ''}`}
          >
            <Sidebar />
          </aside>
        </>
      )}

      {/* ---- Main content area ---- */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isBottom && !isMobile ? 'column' : 'row',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* ---- Mobile: hamburger bar above content ---- */}
        {isTablet && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              padding: '0 var(--spacing-sm)',
              background: 'var(--color-bg-secondary)',
              borderBottom: '1px solid var(--color-border-primary)',
              zIndex: 10,
              gap: 'var(--spacing-sm)',
            }}
          >
            {HamburgerButton}
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
        )}

        {/* Spacer to push content below the tablet top bar */}
        {isTablet && <div style={{ height: 44, width: '100%', flexShrink: 0, position: 'absolute', pointerEvents: 'none' }} />}

        {/* ---- Content wrapper below top bar ---- */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: isBottom && !isMobile ? 'column' : 'row',
            overflow: 'hidden',
            marginTop: isTablet ? 44 : 0,
            minWidth: 0,
          }}
        >
          {/* Email list pane — hidden when a thread is open in 'hidden' pane mode (full-width thread view) */}
          {(!isMobile || showMobileList) && !showHiddenPaneThread && (
            <section
              id="email-list-main"
              aria-label="Email list"
              style={{
                width: isMobile ? '100%' : isTablet ? '100%' : isRight ? `${listWidth}px` : '100%',
                maxWidth: isTablet && !isMobile ? '380px' : undefined,
                height: isBottom && !isMobile ? `${listHeight}px` : '100%',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'var(--color-bg-primary)',
                borderRight: !isTablet && isRight ? '1px solid var(--color-border-primary)' : undefined,
              }}
            >
              {emailList}
            </section>
          )}

          {/* Resize handle between email list and reading pane — desktop only */}
          {!isTablet && !isHidden && (
            <ResizeHandle
              orientation={isBottom ? 'horizontal' : 'vertical'}
              onResize={isBottom ? handleListHeightResize : handleListResize}
              onResizeEnd={isBottom ? handleListHeightResizeEnd : handleListResizeEnd}
            />
          )}

          {/* Reading pane — also shown full-width when a thread is open in 'hidden' pane mode */}
          {(!isHidden || showHiddenPaneThread) && (!isMobile || showMobileReadingPane) && (
            <main
              aria-label="Reading pane"
              style={{
                flex: '1 1 0%',
                height: '100%',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--color-bg-primary)',
                borderTop: isBottom ? '1px solid var(--color-border-primary)' : undefined,
                minWidth: isRight ? 320 : 0,
              }}
            >
              {readingPane}
            </main>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
