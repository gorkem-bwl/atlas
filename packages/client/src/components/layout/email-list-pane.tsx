import { useState, useCallback, useRef, useEffect } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useEmailStore } from '../../stores/email-store';
import { useThreads, useToggleStar, useArchiveThread, useTrashThread, useArchiveWithUndo, useTrashWithUndo } from '../../hooks/use-threads';
import { EmailListItem } from '../email/email-list-item';
import { BulkActions } from '../email/bulk-actions';
import { SearchBar } from '../search/search-bar';
import { EmptyState } from '../ui/empty-state';
import { EmailListSkeleton } from '../ui/skeleton';
import type { EmailCategory, Thread } from '@atlasmail/shared';
import type { CSSProperties } from 'react';

const CATEGORY_LABELS: Record<EmailCategory, string> = {
  important: 'Important',
  other: 'Other',
  newsletters: 'Newsletters',
  notifications: 'Notifications',
};

const CATEGORIES: EmailCategory[] = ['important', 'other', 'newsletters', 'notifications'];

const CATEGORY_COLORS: Record<EmailCategory, string> = {
  important: 'var(--color-category-important)',
  other: 'var(--color-category-other)',
  newsletters: 'var(--color-category-newsletters)',
  notifications: 'var(--color-category-notifications)',
};


export function EmailListPane() {
  const {
    activeCategory,
    setActiveCategory,
    activeThreadId,
    setActiveThread,
    cursorIndex,
    setCursorIndex,
    openCompose,
    selectedThreadIds,
    toggleSelection,
    clearSelection,
  } = useEmailStore();
  const toggleStar = useToggleStar();
  const archiveMutation = useArchiveThread();
  const trashMutation = useTrashThread();
  const archiveWithUndo = useArchiveWithUndo();
  const trashWithUndo = useTrashWithUndo();
  const [searchQuery, setSearchQuery] = useState('');
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  // Keep a stable ref to the current displayed threads list so the cursor event
  // handler can resolve which thread is at the cursor position without stale closure issues.
  const displayThreadsRef = useRef<Thread[]>([]);

  const { data: threads, isLoading } = useThreads(activeCategory);

  const displayThreads = (threads || []).filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.subject?.toLowerCase().includes(q) ||
      t.snippet?.toLowerCase().includes(q) ||
      t.emails?.[0]?.fromName?.toLowerCase().includes(q) ||
      t.emails?.[0]?.fromAddress?.toLowerCase().includes(q)
    );
  });

  // Keep the ref in sync so the cursor-selection event handler is never stale
  displayThreadsRef.current = displayThreads;

  // Listen for the cursor-selection event dispatched by inbox.tsx when `x` is pressed
  useEffect(() => {
    const handleSelectCursor = (e: Event) => {
      const { cursorIndex: idx } = (e as CustomEvent<{ cursorIndex: number }>).detail;
      const thread = displayThreadsRef.current[idx];
      if (thread) toggleSelection(thread.id);
    };
    document.addEventListener('atlasmail:select_cursor', handleSelectCursor);
    return () => document.removeEventListener('atlasmail:select_cursor', handleSelectCursor);
  }, [toggleSelection]);

  const handleThreadClick = useCallback(
    (thread: Thread, index: number) => {
      setCursorIndex(index);
      setActiveThread(thread.id);
    },
    [setCursorIndex, setActiveThread],
  );

  const handleStarClick = useCallback(
    (threadId: string) => {
      toggleStar.mutate(threadId);
    },
    [toggleStar],
  );

  const handleReplyClick = useCallback(
    (threadId: string) => {
      openCompose('reply', threadId);
    },
    [openCompose],
  );

  const handleArchiveClick = useCallback(
    (threadId: string) => {
      archiveWithUndo(threadId, activeCategory);
    },
    [archiveWithUndo, activeCategory],
  );

  const handleTrashClick = useCallback(
    (threadId: string) => {
      trashWithUndo(threadId, activeCategory);
    },
    [trashWithUndo, activeCategory],
  );

  const handleSnoozeClick = useCallback(
    (threadId: string) => {
      document.dispatchEvent(
        new CustomEvent('atlasmail:snooze', { detail: { threadId } }),
      );
    },
    [],
  );

  const handleCheckboxClick = useCallback(
    (threadId: string) => {
      toggleSelection(threadId);
    },
    [toggleSelection],
  );

  const handleBulkArchive = useCallback(() => {
    selectedThreadIds.forEach((id) => archiveMutation.mutate(id));
    clearSelection();
  }, [selectedThreadIds, archiveMutation, clearSelection]);

  const handleBulkTrash = useCallback(() => {
    selectedThreadIds.forEach((id) => trashMutation.mutate(id));
    clearSelection();
  }, [selectedThreadIds, trashMutation, clearSelection]);

  const handleBulkStar = useCallback(() => {
    selectedThreadIds.forEach((id) => toggleStar.mutate(id));
    clearSelection();
  }, [selectedThreadIds, toggleStar, clearSelection]);

  // Mark read/unread are client-side only until a mutation hook exists
  const handleBulkMarkRead = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const handleBulkMarkUnread = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Email categories"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border-primary)',
          background: 'var(--color-bg-primary)',
          flexShrink: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat === activeCategory;
          const color = CATEGORY_COLORS[cat];
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: 'none',
                borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                background: 'transparent',
                color: isActive ? color : 'var(--color-text-tertiary)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: isActive
                  ? ('var(--font-weight-semibold)' as CSSProperties['fontWeight'])
                  : ('var(--font-weight-normal)' as CSSProperties['fontWeight']),
                fontFamily: 'var(--font-family)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color var(--transition-fast)',
                marginBottom: '-1px',
              }}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          );
        })}
      </div>

      {/* Search bar */}
      <div
        role="search"
        style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderBottom: '1px solid var(--color-border-primary)',
          flexShrink: 0,
        }}
      >
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search conversations..."
        />
      </div>

      {/* Bulk actions toolbar — visible when 1+ threads are selected */}
      {selectedThreadIds.size > 0 && (
        <BulkActions
          selectedCount={selectedThreadIds.size}
          onArchive={handleBulkArchive}
          onTrash={handleBulkTrash}
          onStar={handleBulkStar}
          onMarkRead={handleBulkMarkRead}
          onMarkUnread={handleBulkMarkUnread}
          onClearSelection={clearSelection}
        />
      )}

      {/* Thread list */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <EmailListSkeleton />
        ) : displayThreads.length === 0 ? (
          <EmptyState
            type={searchQuery ? 'search' : 'inbox'}
            description={
              searchQuery
                ? `No conversations match "${searchQuery}"`
                : undefined
            }
          />
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            data={displayThreads}
            itemContent={(index, thread) => (
              <EmailListItem
                key={thread.id}
                thread={thread}
                isSelected={thread.id === activeThreadId}
                isCursor={index === cursorIndex}
                isMultiSelected={selectedThreadIds.has(thread.id)}
                onClick={() => handleThreadClick(thread, index)}
                onStarClick={() => handleStarClick(thread.id)}
                onCheckboxClick={() => handleCheckboxClick(thread.id)}
                onReplyClick={() => handleReplyClick(thread.id)}
                onArchiveClick={() => handleArchiveClick(thread.id)}
                onTrashClick={() => handleTrashClick(thread.id)}
                onSnoozeClick={() => handleSnoozeClick(thread.id)}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
