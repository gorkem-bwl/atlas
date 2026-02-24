import type { ReactNode } from 'react';
import { useUIStore } from '../../stores/ui-store';
import { useSettingsStore } from '../../stores/settings-store';
import { Sidebar } from './sidebar';

interface AppLayoutProps {
  emailList: ReactNode;
  readingPane: ReactNode;
}

export function AppLayout({ emailList, readingPane }: AppLayoutProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const readingPanePosition = useSettingsStore((s) => s.readingPane);

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
      {/* Sidebar */}
      {sidebarOpen && (
        <aside
          style={{
            width: 'var(--sidebar-width)',
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
      )}

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: readingPanePosition === 'bottom' ? 'column' : 'row',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {/* Email list pane */}
        <div
          style={{
            width: readingPanePosition === 'bottom' ? '100%' : 'var(--email-list-width)',
            height: readingPanePosition === 'bottom' ? '40%' : '100%',
            flexShrink: 0,
            borderRight: readingPanePosition !== 'bottom' ? '1px solid var(--color-border-primary)' : 'none',
            borderBottom: readingPanePosition === 'bottom' ? '1px solid var(--color-border-primary)' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'var(--color-bg-primary)',
          }}
        >
          {emailList}
        </div>

        {/* Reading pane */}
        {readingPanePosition !== 'hidden' && (
          <div
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
          </div>
        )}
      </div>
    </div>
  );
}
