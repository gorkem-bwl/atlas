import { useCallback } from 'react';
import { AppLayout } from '../components/layout/app-layout';
import { EmailListPane } from '../components/layout/email-list-pane';
import { ReadingPane } from '../components/layout/reading-pane';
import { ComposeModal } from '../components/compose/compose-modal';
import { useEmailStore } from '../stores/email-store';
import { useUIStore } from '../stores/ui-store';
import { useShortcut } from '../providers/shortcut-provider';
import { useArchiveThread, useTrashThread, useToggleStar } from '../hooks/use-threads';

// Mock thread count for cursor bounds — actual threads come from the store/query
const MOCK_MAX_THREADS = 50;

export function InboxPage() {
  const {
    moveCursor,
    activeThreadId,
    setActiveThread,
    openCompose,
    setActiveCategory,
  } = useEmailStore();
  const { toggleCommandPalette, toggleSidebar } = useUIStore();
  const archiveMutation = useArchiveThread();
  const trashMutation = useTrashThread();
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

  // Action shortcuts
  const handleArchive = useCallback(() => {
    if (activeThreadId) archiveMutation.mutate(activeThreadId);
  }, [activeThreadId, archiveMutation]);

  const handleTrash = useCallback(() => {
    if (activeThreadId) trashMutation.mutate(activeThreadId);
  }, [activeThreadId, trashMutation]);

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
  useShortcut('command_palette', handleCommandPalette, 'global');
  useShortcut('toggle_sidebar', handleToggleSidebar, 'global');

  return (
    <>
      <AppLayout
        emailList={<EmailListPane />}
        readingPane={<ReadingPane />}
      />
      <ComposeModal />
    </>
  );
}
