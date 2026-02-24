import { useState, useCallback, useRef } from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { useEmailStore } from '../../stores/email-store';
import { useThreads, useToggleStar } from '../../hooks/use-threads';
import { EmailListItem } from '../email/email-list-item';
import { SearchBar } from '../search/search-bar';
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
  const { activeCategory, setActiveCategory, activeThreadId, setActiveThread, cursorIndex, setCursorIndex } = useEmailStore();
  const toggleStar = useToggleStar();
  const [searchQuery, setSearchQuery] = useState('');
  const virtuosoRef = useRef<VirtuosoHandle>(null);

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

      {/* Thread list */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--font-size-md)',
              fontFamily: 'var(--font-family)',
            }}
          >
            Loading...
          </div>
        ) : displayThreads.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-tertiary)',
              fontFamily: 'var(--font-family)',
              gap: 'var(--spacing-sm)',
            }}
          >
            <span style={{ fontSize: 'var(--font-size-lg)' }}>
              {searchQuery ? 'No results found' : 'All caught up'}
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)' }}>
              {searchQuery ? `No conversations match "${searchQuery}"` : 'No conversations in this category'}
            </span>
          </div>
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
                onClick={() => handleThreadClick(thread, index)}
                onStarClick={() => handleStarClick(thread.id)}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
