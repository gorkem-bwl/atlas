import { Node, mergeAttributes } from '@tiptap/core';

/**
 * DrawingEmbed — an inline block that references an Excalidraw drawing by ID.
 *
 * Renders a clickable card with the drawing title. On click, navigates to
 * /draw/:drawingId. This is an "atom" node (not editable inline).
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawingEmbed: {
      insertDrawingEmbed: (options: { drawingId: string; title: string }) => ReturnType;
    };
  }
}

export const DrawingEmbed = Node.create({
  name: 'drawingEmbed',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      drawingId: { default: null },
      title: { default: 'Untitled drawing' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="drawing-embed"]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          return {
            drawingId: el.getAttribute('data-drawing-id'),
            title: el.getAttribute('data-title') || 'Untitled drawing',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { drawingId, title } = HTMLAttributes;
    return [
      'div',
      mergeAttributes({
        'data-type': 'drawing-embed',
        'data-drawing-id': drawingId,
        'data-title': title,
        class: 'drawing-embed-block',
        style: [
          'display: flex',
          'align-items: center',
          'gap: 10px',
          'padding: 12px 16px',
          'margin: 8px 0',
          'border: 1px solid var(--color-border-primary)',
          'border-radius: 8px',
          'background: var(--color-bg-tertiary)',
          'cursor: pointer',
          'transition: background 0.15s ease',
          'font-family: var(--font-family)',
          'text-decoration: none',
          'color: inherit',
        ].join('; '),
      }),
      // Icon placeholder
      [
        'span',
        {
          style: [
            'display: inline-flex',
            'align-items: center',
            'justify-content: center',
            'width: 32px',
            'height: 32px',
            'border-radius: 6px',
            'background: color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
            'color: var(--color-accent-primary)',
            'flex-shrink: 0',
            'font-size: 16px',
          ].join('; '),
        },
        '\u270F', // pencil emoji
      ],
      // Text content
      [
        'span',
        {
          style: [
            'flex: 1',
            'min-width: 0',
          ].join('; '),
        },
        // Title
        [
          'span',
          {
            style: [
              'display: block',
              'font-size: 13px',
              'font-weight: 500',
              'color: var(--color-text-primary)',
              'overflow: hidden',
              'text-overflow: ellipsis',
              'white-space: nowrap',
            ].join('; '),
          },
          title || 'Untitled drawing',
        ],
        // Subtitle
        [
          'span',
          {
            style: [
              'display: block',
              'font-size: 11px',
              'color: var(--color-text-tertiary)',
              'margin-top: 2px',
            ].join('; '),
          },
          'Excalidraw drawing',
        ],
      ],
      // Arrow
      [
        'span',
        {
          style: [
            'color: var(--color-text-tertiary)',
            'font-size: 14px',
            'flex-shrink: 0',
          ].join('; '),
        },
        '\u2192', // right arrow
      ],
    ];
  },

  addCommands() {
    return {
      insertDrawingEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement('div');
      dom.setAttribute('data-type', 'drawing-embed');
      dom.setAttribute('data-drawing-id', node.attrs.drawingId || '');
      dom.setAttribute('data-title', node.attrs.title || '');
      dom.className = 'drawing-embed-block';
      Object.assign(dom.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        margin: '8px 0',
        border: '1px solid var(--color-border-primary)',
        borderRadius: '8px',
        background: 'var(--color-bg-tertiary)',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        fontFamily: 'var(--font-family)',
      });

      // Icon
      const iconWrap = document.createElement('span');
      Object.assign(iconWrap.style, {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        background: 'color-mix(in srgb, var(--color-accent-primary) 12%, transparent)',
        color: 'var(--color-accent-primary)',
        flexShrink: '0',
        fontSize: '16px',
      });
      iconWrap.textContent = '\u270F';
      dom.appendChild(iconWrap);

      // Text container
      const textWrap = document.createElement('span');
      Object.assign(textWrap.style, {
        flex: '1',
        minWidth: '0',
      });

      const titleEl = document.createElement('span');
      Object.assign(titleEl.style, {
        display: 'block',
        fontSize: '13px',
        fontWeight: '500',
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
      titleEl.textContent = node.attrs.title || 'Untitled drawing';
      textWrap.appendChild(titleEl);

      const subtitle = document.createElement('span');
      Object.assign(subtitle.style, {
        display: 'block',
        fontSize: '11px',
        color: 'var(--color-text-tertiary)',
        marginTop: '2px',
      });
      subtitle.textContent = 'Excalidraw drawing';
      textWrap.appendChild(subtitle);

      dom.appendChild(textWrap);

      // Arrow
      const arrow = document.createElement('span');
      Object.assign(arrow.style, {
        color: 'var(--color-text-tertiary)',
        fontSize: '14px',
        flexShrink: '0',
      });
      arrow.textContent = '\u2192';
      dom.appendChild(arrow);

      // Click handler — navigate to the drawing
      dom.addEventListener('click', () => {
        const drawingId = node.attrs.drawingId;
        if (drawingId) {
          window.location.href = `/draw/${drawingId}`;
        }
      });

      // Hover effects
      dom.addEventListener('mouseenter', () => {
        dom.style.background = 'var(--color-surface-hover)';
      });
      dom.addEventListener('mouseleave', () => {
        dom.style.background = 'var(--color-bg-tertiary)';
      });

      return { dom };
    };
  },
});
