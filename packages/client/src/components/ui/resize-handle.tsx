import { useRef, useCallback, type CSSProperties } from 'react';

interface ResizeHandleProps {
  orientation: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
  onResizeEnd: () => void;
}

/**
 * ResizeHandle — thin draggable splitter between two panes.
 *
 * Usage (vertical, left-right split):
 *   <ResizeHandle
 *     orientation="vertical"
 *     onResize={(delta) => setWidth((w) => clamp(w + delta, MIN, MAX))}
 *     onResizeEnd={() => persistWidth()}
 *   />
 *
 * The component uses document-level mousemove/mouseup listeners during drag
 * so the cursor never "escapes" the handle even if the mouse moves fast.
 * Text-selection on <body> is suppressed while dragging.
 */
export function ResizeHandle({ orientation, onResize, onResizeEnd }: ResizeHandleProps) {
  const isDragging = useRef(false);
  const lastPos = useRef(0);
  const hitAreaRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  const isVertical = orientation === 'vertical';

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const current = isVertical ? e.clientX : e.clientY;
      const delta = current - lastPos.current;
      lastPos.current = current;
      onResize(delta);
    },
    [isVertical, onResize],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Restore body text-selection and cursor
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    // Reset line appearance
    if (lineRef.current) {
      lineRef.current.style.background = 'transparent';
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    onResizeEnd();
  }, [handleMouseMove, onResizeEnd]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      isDragging.current = true;
      lastPos.current = isVertical ? e.clientX : e.clientY;

      // Suppress text selection and lock cursor globally so it does not
      // flicker when the mouse moves faster than React can re-render.
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isVertical ? 'col-resize' : 'row-resize';

      // Show active line immediately
      if (lineRef.current) {
        lineRef.current.style.background = 'var(--color-accent-primary)';
      }

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isVertical, handleMouseMove, handleMouseUp],
  );

  // --- Styles ---

  // Outer hit area: 8px wide/tall, transparent, flex-shrink: 0 so it never
  // gets squeezed out of the layout.
  const hitAreaStyle: CSSProperties = {
    flexShrink: 0,
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isVertical ? 'col-resize' : 'row-resize',
    // Vertical handle → 8px wide, full height; horizontal → 8px tall, full width
    width: isVertical ? '8px' : '100%',
    height: isVertical ? '100%' : '8px',
  };

  // Inner visible line: 4px in the drag axis, full span in the other axis.
  const lineStyle: CSSProperties = {
    width: isVertical ? '1px' : '100%',
    height: isVertical ? '100%' : '1px',
    background: 'transparent',
    transition: 'background var(--transition-fast)',
    pointerEvents: 'none',
    borderRadius: '9999px',
  };

  return (
    <div
      ref={hitAreaRef}
      style={hitAreaStyle}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => {
        if (!isDragging.current && lineRef.current) {
          lineRef.current.style.background = 'var(--color-border-primary)';
        }
      }}
      onMouseLeave={() => {
        if (!isDragging.current && lineRef.current) {
          lineRef.current.style.background = 'transparent';
        }
      }}
      role="separator"
      aria-orientation={orientation}
      aria-label={isVertical ? 'Resize panes horizontally' : 'Resize panes vertically'}
      tabIndex={0}
      onKeyDown={(e) => {
        // Keyboard accessibility: arrow keys nudge by 20px
        const step = 20;
        if (isVertical && e.key === 'ArrowLeft') {
          onResize(-step);
          onResizeEnd();
        } else if (isVertical && e.key === 'ArrowRight') {
          onResize(step);
          onResizeEnd();
        } else if (!isVertical && e.key === 'ArrowUp') {
          onResize(-step);
          onResizeEnd();
        } else if (!isVertical && e.key === 'ArrowDown') {
          onResize(step);
          onResizeEnd();
        }
      }}
    >
      <div ref={lineRef} style={lineStyle} />
    </div>
  );
}
