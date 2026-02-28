import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from './providers/theme-provider';
import { QueryProvider } from './providers/query-provider';
import { ShortcutProvider } from './providers/shortcut-provider';
import { TooltipProvider } from './components/ui/tooltip';
import { useAuthStore } from './stores/auth-store';
import { ROUTES } from './config/routes';
import { InboxPage } from './pages/inbox';
import { LoginPage } from './pages/login';
import { OAuthCallback } from './components/auth/oauth-callback';
import { SettingsPage, SettingsModal } from './pages/settings';
import { CalendarPage } from './pages/calendar';
import { DocsPage } from './pages/docs';
import { DrawPage } from './pages/draw';
import { TasksPage } from './pages/tasks';
import { TablesPage } from './pages/tables';
import { HomePage } from './pages/home';
import { CommandPalette } from './components/ui/command-palette';
import { ErrorBoundary } from './components/ui/error-boundary';
import { useEffect, useRef, type ReactNode } from 'react';
import { api } from './lib/api-client';

const DEV_MODE = import.meta.env.DEV && !import.meta.env.VITE_GOOGLE_CLIENT_ID;

function DevAuthInit() {
  const setAccount = useAuthStore((s) => s.setAccount);
  useEffect(() => {
    if (DEV_MODE) {
      setAccount({
        id: 'dev-account',
        userId: 'dev-user',
        email: 'demo@atlasmail.dev',
        name: 'Demo User',
        pictureUrl: null,
        provider: 'google',
        providerId: 'dev',
        historyId: null,
        lastSync: null,
        syncStatus: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [setAccount]);
  return null;
}

// Stable client ID persisted in localStorage so the server can identify
// returning local users and avoid creating duplicate accounts.
function getOrCreateClientId(): string {
  const key = 'atlasmail_client_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

function LocalIdentityInit() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const addAccount = useAuthStore((s) => s.addAccount);
  const setLoading = useAuthStore((s) => s.setLoading);
  const inflight = useRef(false);

  useEffect(() => {
    if (DEV_MODE || isAuthenticated || inflight.current) return;
    inflight.current = true;
    // Signal that auth is initialising so pages can wait before firing API calls
    setLoading(true);

    const clientId = getOrCreateClientId();
    api.post('/auth/local', { clientId }).then(({ data }) => {
      const { accessToken, refreshToken, account } = data.data;
      addAccount(account, accessToken, refreshToken);
    }).catch(() => {
      // Non-critical — user can still use Google OAuth to authenticate
      setLoading(false);
    }).finally(() => {
      inflight.current = false;
    });
  }, [isAuthenticated, addAccount, setLoading]);

  return null;
}

/** Waits for auth init (local or Google) before rendering children. Does NOT redirect. */
function AuthReadyGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (!isAuthenticated && isLoading && !DEV_MODE) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--font-size-md)',
        }}
      >
        {t('common.loading')}
      </div>
    );
  }

  return <>{children}</>;
}

/** Requires Google OAuth. Redirects to HOME if not authenticated. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading && !DEV_MODE) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-bg-primary)',
          color: 'var(--color-text-secondary)',
          fontFamily: 'var(--font-family)',
          fontSize: 'var(--font-size-md)',
        }}
      >
        {t('common.loading')}
      </div>
    );
  }

  if (!isAuthenticated && !DEV_MODE) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <TooltipProvider>
          <ShortcutProvider>
            <BrowserRouter>
            <DevAuthInit />
            <LocalIdentityInit />
            <ErrorBoundary>
              <Routes>
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path={ROUTES.AUTH_CALLBACK} element={<OAuthCallback />} />
                <Route
                  path={ROUTES.HOME}
                  element={<HomePage />}
                />
                <Route
                  path={ROUTES.INBOX}
                  element={
                    <ProtectedRoute>
                      <InboxPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.SETTINGS}
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.CALENDAR}
                  element={
                    <ProtectedRoute>
                      <CalendarPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.DOCS}
                  element={<AuthReadyGate><DocsPage /></AuthReadyGate>}
                />
                <Route
                  path={ROUTES.DOC_DETAIL}
                  element={<AuthReadyGate><DocsPage /></AuthReadyGate>}
                />
                <Route
                  path={ROUTES.DRAW}
                  element={<AuthReadyGate><DrawPage /></AuthReadyGate>}
                />
                <Route
                  path={ROUTES.DRAW_DETAIL}
                  element={<AuthReadyGate><DrawPage /></AuthReadyGate>}
                />
                <Route
                  path={ROUTES.TASKS}
                  element={<AuthReadyGate><TasksPage /></AuthReadyGate>}
                />
                <Route
                  path={ROUTES.TABLES}
                  element={<AuthReadyGate><TablesPage /></AuthReadyGate>}
                />
                <Route
                  path={ROUTES.TABLE_DETAIL}
                  element={<AuthReadyGate><TablesPage /></AuthReadyGate>}
                />
                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
              </Routes>
              <CommandPalette />
              <SettingsModal />
            </ErrorBoundary>
            </BrowserRouter>
          </ShortcutProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
