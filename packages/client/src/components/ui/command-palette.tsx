import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search, Briefcase, Users, FolderKanban, PenTool, HardDrive,
  Table2, CheckSquare, FileText, Pencil, Monitor, CalendarDays, Store,
  Plus, LayoutDashboard, Settings, Clock, X, Loader2,
} from 'lucide-react';
import { useGlobalSearch } from '../../hooks/use-global-search';
import type { GlobalSearchResult } from '@atlasmail/shared';
import '../../styles/command-palette.css';

// ─── Constants ───────────────────────────────────────────────────

const RECENT_SEARCHES_KEY = 'atlas_cmd_recent';
const MAX_RECENT = 5;

const SEARCH_HINTS = [
  'Search contacts, deals, tasks...',
  'Type a page name to navigate...',
  'Create a new contact or deal...',
  'Find documents and files...',
  'Jump to any app with Cmd+K...',
];

const NAV_ITEMS = [
  { id: 'crm', labelKey: 'sidebar.crm', icon: Briefcase, path: '/crm' },
  { id: 'hr', labelKey: 'sidebar.hr', icon: Users, path: '/hr' },
  { id: 'calendar', labelKey: 'sidebar.calendar', icon: CalendarDays, path: '/calendar' },
  { id: 'projects', labelKey: 'sidebar.projects', icon: FolderKanban, path: '/projects' },
  { id: 'sign', labelKey: 'sidebar.sign', icon: PenTool, path: '/sign-app' },
  { id: 'drive', labelKey: 'sidebar.drive', icon: HardDrive, path: '/drive' },
  { id: 'tables', labelKey: 'sidebar.tables', icon: Table2, path: '/tables' },
  { id: 'tasks', labelKey: 'sidebar.tasks', icon: CheckSquare, path: '/tasks' },
  { id: 'docs', labelKey: 'sidebar.write', icon: FileText, path: '/docs' },
  { id: 'draw', labelKey: 'sidebar.draw', icon: Pencil, path: '/draw' },
  { id: 'system', labelKey: 'sidebar.system', icon: Monitor, path: '/system' },
  { id: 'marketplace', labelKey: 'sidebar.marketplace', icon: Store, path: '/marketplace' },
  { id: 'settings', labelKey: 'common.settings', icon: Settings, path: '/settings' },
];

const ACTION_ITEMS = [
  { id: 'new-contact', labelKey: 'commandPalette.createContact', icon: Plus, path: '/crm?view=contacts', keywords: ['new', 'add', 'contact'] },
  { id: 'new-deal', labelKey: 'commandPalette.createDeal', icon: Plus, path: '/crm?view=pipeline', keywords: ['new', 'add', 'deal'] },
  { id: 'new-task', labelKey: 'commandPalette.newTask', icon: Plus, path: '/tasks', keywords: ['new', 'add', 'task'] },
  { id: 'new-doc', labelKey: 'commandPalette.newDocument', icon: Plus, path: '/docs', keywords: ['new', 'add', 'document'] },
  { id: 'new-drawing', labelKey: 'commandPalette.newDrawing', icon: Plus, path: '/draw', keywords: ['new', 'add', 'drawing'] },
];

const APP_ICONS: Record<string, typeof Briefcase> = {
  crm: Briefcase, hr: Users, tasks: CheckSquare, drive: HardDrive,
  docs: FileText, draw: Pencil, tables: Table2, sign: PenTool, projects: FolderKanban,
};

// ─── Recent searches helpers ─────────────────────────────────────

interface RecentSearch { query: string; timestamp: number }

function loadRecent(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
  } catch { return []; }
}

function saveRecent(items: RecentSearch[]) {
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
}

function addRecent(query: string) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return;
  const items = loadRecent().filter((r) => r.query !== trimmed);
  items.unshift({ query: trimmed, timestamp: Date.now() });
  saveRecent(items);
}

function removeRecent(timestamp: number) {
  saveRecent(loadRecent().filter((r) => r.timestamp !== timestamp));
}

// ─── Component ───────────────────────────────────────────────────

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  const { data: searchResults, isLoading } = useGlobalSearch(query.length >= 2 ? query : '');

  // Cmd+K global shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Body scroll lock when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setRecentSearches(loadRecent());
      setHintIndex((prev) => (prev + 1) % SEARCH_HINTS.length);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSelect = useCallback((value: string) => {
    // Save search to recent if it was a text search
    if (query.trim().length >= 2) addRecent(query);

    setOpen(false);
    setQuery('');

    const nav = NAV_ITEMS.find((n) => n.id === value);
    if (nav) { navigate(nav.path); return; }
    const action = ACTION_ITEMS.find((a) => a.id === value);
    if (action) { navigate(action.path); return; }
    if (value.startsWith('search-') && searchResults) {
      const result = searchResults.find((r) => `search-${r.appId}-${r.recordId}` === value);
      if (result) {
        const routes: Record<string, string> = {
          crm: '/crm', hr: '/hr', tasks: '/tasks', drive: '/drive',
          docs: '/docs', draw: '/draw', tables: '/tables', sign: '/sign-app', projects: '/projects',
        };
        navigate(`${routes[result.appId] || '/' + result.appId}?id=${result.recordId}`);
      }
    }
  }, [navigate, searchResults, query]);

  const handleRecentClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
  }, []);

  const handleRemoveRecent = useCallback((e: React.MouseEvent, timestamp: number) => {
    e.stopPropagation();
    removeRecent(timestamp);
    setRecentSearches(loadRecent());
  }, []);

  const resultCount = searchResults?.length ?? 0;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}
      label={t('common.commandPalette')}
      overlayClassName="cmd-overlay"
      contentClassName="cmd-content"
    >
      <div className="cmd-header">
        {isLoading ? (
          <Loader2 size={16} style={{ color: 'var(--color-accent-primary)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
        ) : (
          <Search size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
        )}
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={SEARCH_HINTS[hintIndex]}
          className="cmd-input"
        />
        {query && (
          <button
            className="cmd-clear-btn"
            onClick={() => setQuery('')}
            aria-label="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Result count */}
      {query.length >= 2 && !isLoading && (
        <div className="cmd-result-count">
          {resultCount > 0
            ? `${resultCount} result${resultCount !== 1 ? 's' : ''}`
            : t('common.noResults')}
        </div>
      )}

      <Command.List className="cmd-list">
        <Command.Empty className="cmd-empty">{t('common.noResults')}</Command.Empty>

        {/* Recent searches (shown when no query) */}
        {!query && recentSearches.length > 0 && (
          <Command.Group heading={t('commandPalette.recentSearches')}>
            {recentSearches.map((recent) => (
              <Command.Item
                key={recent.timestamp}
                value={`recent-${recent.query}`}
                onSelect={() => handleRecentClick(recent.query)}
                className="cmd-item"
              >
                <span className="cmd-item-icon"><Clock size={14} /></span>
                <span className="cmd-item-title" style={{ flex: 1 }}>{recent.query}</span>
                <button
                  className="cmd-recent-remove"
                  onClick={(e) => handleRemoveRecent(e, recent.timestamp)}
                  aria-label="Remove"
                >
                  <X size={12} />
                </button>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {/* Search results */}
        {searchResults && searchResults.length > 0 && (
          <Command.Group heading={`${t('common.records')} (${resultCount})`}>
            {searchResults.slice(0, 8).map((result) => {
              const Icon = APP_ICONS[result.appId] || LayoutDashboard;
              return (
                <Command.Item
                  key={`search-${result.appId}-${result.recordId}`}
                  value={`search-${result.appId}-${result.recordId}`}
                  onSelect={handleSelect}
                  className="cmd-item"
                >
                  <span className="cmd-item-icon"><Icon size={14} /></span>
                  <div className="cmd-item-text">
                    <span className="cmd-item-title">{result.title}</span>
                    <span className="cmd-item-desc">{result.appName}</span>
                  </div>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {/* Navigation */}
        <Command.Group heading={t('common.navigation')}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item key={item.id} value={item.id} onSelect={handleSelect} className="cmd-item">
                <span className="cmd-item-icon"><Icon size={14} /></span>
                <span className="cmd-item-title">{t(item.labelKey)}</span>
              </Command.Item>
            );
          })}
        </Command.Group>

        {/* Actions */}
        <Command.Group heading={t('common.actions')}>
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item key={item.id} value={item.id} keywords={item.keywords} onSelect={handleSelect} className="cmd-item">
                <span className="cmd-item-icon"><Icon size={14} /></span>
                <span className="cmd-item-title">{t(item.labelKey)}</span>
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>

      {/* Footer hint */}
      <div className="cmd-footer">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </Command.Dialog>
  );
}
