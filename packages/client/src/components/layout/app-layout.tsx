import { useState, useCallback, type ReactNode } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useSettingsStore } from '../../stores/settings-store';
import { Sidebar } from './sidebar';
import { ResizeHandle } from '../ui/resize-handle';

// ---- Constants ---------------------------------------------------------------

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 320;
const SIDEBAR_DEFAULT = 220;
const SIDEBAR_LS_KEY = 'atlasmail_sidebar_width';

const LIST_MIN = 280;
const LIST_MAX = 600;
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
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const readingPanePosition = useSettingsStore((s) => s.readingPane);

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

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: 'var(--color-bg-primary)',
        fontFamily: 'var(--font-family)',
      }}
    >
      {/* Skip to main content — visually hidden, visible on keyboard focus */}
      <a href="#email-list-main" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <aside
            aria-label="Application sidebar"
            style={{
              width: `${sidebarWidth}px`,
              flexShrink: 0,
              height: '100%',
              borderRight: '1px solid var(--color-border-primary)',
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

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isBottom ? 'column' : 'row',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Email list pane */}
        <section
          id="email-list-main"
          aria-label="Email list"
          style={{
            width: isBottom ? '100%' : `${listWidth}px`,
            height: isBottom ? `${listHeight}px` : '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--color-bg-primary)',
          }}
        >
          {emailList}
        </section>

        {/* Resize handle between email list and reading pane */}
        {readingPanePosition !== 'hidden' && (
          <ResizeHandle
            orientation={isBottom ? 'horizontal' : 'vertical'}
            onResize={isBottom ? handleListHeightResize : handleListResize}
            onResizeEnd={isBottom ? handleListHeightResizeEnd : handleListResizeEnd}
          />
        )}

        {/* Reading pane */}
        {readingPanePosition !== 'hidden' && (
          <main
            aria-label="Reading pane"
            style={{
              flex: 1,
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-bg-primary)',
              minWidth: 0,
            }}
          >
            {readingPane}
          </main>
        )}
      </div>
    </div>
  );
}
