import { useCallback, useEffect } from 'react';
import { AppLayout } from '../components/layout/app-layout';
import { EmailListPane } from '../components/layout/email-list-pane';
import { ReadingPane } from '../components/layout/reading-pane';
import { ComposeModal } from '../components/compose/compose-modal';
import { ToastContainer } from '../components/ui/toast';
import { useEmailStore } from '../stores/email-store';
import { useUIStore } from '../stores/ui-store';
import { useShortcut, useShortcutEngine } from '../providers/shortcut-provider';
import {
  useArchiveWithUndo,
  useTrashWithUndo,
  useToggleStar,
} from '../hooks/use-threads';

// Mock thread count for cursor bounds — actual threads come from the store/query
const MOCK_MAX_THREADS = 50;

export function InboxPage() {
  const {
    moveCursor,
    activeThreadId,
    activeCategory,
    cursorIndex,
    setActiveThread,
    openCompose,
    setActiveCategory,
    selectedThreadIds,
    clearSelection,
  } = useEmailStore();
  const { toggleCommandPalette, toggleSidebar } = useUIStore();
  const archiveWithUndo = useArchiveWithUndo();
  const trashWithUndo = useTrashWithUndo();
  const starMutation = useToggleStar();

  // Navigation shortcuts
  const handleMoveDown = useCallback(() => moveCursor(1, MOCK_MAX_THREADS), [moveCursor]);
  const handleMoveUp = useCallback(() => moveCursor(-1, MOCK_MAX_THREADS), [moveCursor]);
  const handleOpenThread = useCallback(() => {
    // The cursor index maps to the active thread — handled in email-list-pane
  }, []);
  const handleGoBack = useCallback(() => setActiveThread(null), [setActiveThread]);

  // Category navigation
  const handleGoImportant = useCallback(() => setActiveCategory('important'), [setActiveCategory]);
  const handleGoOther = useCallback(() => setActiveCategory('other'), [setActiveCategory]);
  const handleGoNewsletters = useCallback(() => setActiveCategory('newsletters'), [setActiveCategory]);
  const handleGoNotifications = useCallback(() => setActiveCategory('notifications'), [setActiveCategory]);

  // Action shortcuts — use undo-aware variants so the user can recover
  const handleArchive = useCallback(() => {
    if (activeThreadId) archiveWithUndo(activeThreadId, activeCategory);
  }, [activeThreadId, activeCategory, archiveWithUndo]);

  const handleTrash = useCallback(() => {
    if (activeThreadId) trashWithUndo(activeThreadId, activeCategory);
  }, [activeThreadId, activeCategory, trashWithUndo]);

  const handleStar = useCallback(() => {
    if (activeThreadId) starMutation.mutate(activeThreadId);
  }, [activeThreadId, starMutation]);

  // Compose shortcuts
  const handleCompose = useCallback(() => openCompose('new'), [openCompose]);
  const handleReply = useCallback(() => {
    if (activeThreadId) openCompose('reply', activeThreadId);
  }, [activeThreadId, openCompose]);
  const handleReplyAll = useCallback(() => {
    if (activeThreadId) openCompose('reply_all', activeThreadId);
  }, [activeThreadId, openCompose]);
  const handleForward = useCallback(() => {
    if (activeThreadId) openCompose('forward', activeThreadId);
  }, [activeThreadId, openCompose]);

  // UI shortcuts
  const handleCommandPalette = useCallback(() => toggleCommandPalette(), [toggleCommandPalette]);
  const handleToggleSidebar = useCallback(() => toggleSidebar(), [toggleSidebar]);

  // Snooze shortcut — dispatches a custom event so the SnoozePopover can open itself
  const handleSnooze = useCallback(() => {
    if (!activeThreadId) return;
    document.dispatchEvent(
      new CustomEvent('atlasmail:snooze', { detail: { threadId: activeThreadId } }),
    );
  }, [activeThreadId]);

  // Selection shortcuts
  // `x` toggles the selection state of whichever thread the cursor is on
  const handleSelectToggle = useCallback(() => {
    // The thread list in email-list-pane filters by searchQuery, so we need the
    // cursored thread id. We derive it from the store's thread query via a
    // custom event so we don't duplicate query logic here.
    document.dispatchEvent(
      new CustomEvent('atlasmail:select_cursor', { detail: { cursorIndex } }),
    );
  }, [cursorIndex]);

  // Escape clears multi-selection when threads are selected (inbox context only)
  const handleClearSelection = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Register Escape to clear selection directly — only fires when there are selections.
  // `go_back` already owns Escape in 'thread' context so there's no conflict.
  const shortcutEngine = useShortcutEngine();
  useEffect(() => {
    if (selectedThreadIds.size === 0) {
      shortcutEngine.unregister('clear_selection');
      return;
    }
    shortcutEngine.register('clear_selection', 'Escape', handleClearSelection, 'inbox');
    return () => shortcutEngine.unregister('clear_selection');
  }, [selectedThreadIds.size, handleClearSelection, shortcutEngine]);

  // Register all shortcuts
  useShortcut('move_down', handleMoveDown, 'inbox');
  useShortcut('move_up', handleMoveUp, 'inbox');
  useShortcut('open_thread', handleOpenThread, 'inbox');
  useShortcut('go_back', handleGoBack, 'thread');
  useShortcut('go_important', handleGoImportant, 'global');
  useShortcut('go_other', handleGoOther, 'global');
  useShortcut('go_newsletters', handleGoNewsletters, 'global');
  useShortcut('go_notifications', handleGoNotifications, 'global');
  useShortcut('archive', handleArchive, 'inbox');
  useShortcut('trash', handleTrash, 'inbox');
  useShortcut('star', handleStar, 'inbox');
  useShortcut('compose_new', handleCompose, 'inbox');
  useShortcut('reply', handleReply, 'thread');
  useShortcut('reply_all', handleReplyAll, 'thread');
  useShortcut('forward', handleForward, 'thread');
  useShortcut('snooze', handleSnooze, 'thread');
  useShortcut('select_toggle', handleSelectToggle, 'inbox');
  useShortcut('command_palette', handleCommandPalette, 'global');
  useShortcut('toggle_sidebar', handleToggleSidebar, 'global');

  return (
    <>
      <AppLayout
        emailList={<EmailListPane />}
        readingPane={<ReadingPane />}
      />
      <ComposeModal />
      <ToastContainer />
    </>
  );
}
