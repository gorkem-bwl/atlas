/**
 * PageMention inline node extension for Tiptap v2.
 *
 * Renders as an inline chip that links to another document in the workspace.
 * The chip displays the document's icon (if any) followed by its title.
 *
 * Usage in editor setup:
 *   import { PageMention } from './extensions/page-mention';
 *   extensions: [ ..., PageMention ]
 *
 * Insert via command:
 *   editor.chain().focus().insertPageMention({ id: 'abc', title: 'My Doc', icon: '📄' }).run()
 *
 * Mention detection (triggering on `@`):
 *   Handle in the editor's `onUpdate` callback — read the text before the
 *   cursor, match /@([^@\n]*)$/, open a page-picker UI, then call
 *   `insertPageMention` with the chosen document. This avoids a dependency on
 *   @tiptap/suggestion (installed at v3.x, which conflicts with the v2.x
 *   starter-kit used in this project).
 *
 * HTML serialisation:
 *   <span data-type="page-mention" data-id="<id>" data-title="<title>" data-icon="<icon>" class="page-mention">
 *     [icon ]title
 *   </span>
 */

import { Node, mergeAttributes } from '@tiptap/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageMentionAttrs {
  /** Unique document ID. */
  id: string;
  /** Human-readable document title shown in the chip. */
  title: string;
  /** Optional emoji or short string used as the doc icon. */
  icon: string | null;
}

// ─── Command augmentation ─────────────────────────────────────────────────────
//
// Extends the Tiptap Commands interface so `editor.commands.insertPageMention()`
// is typed correctly throughout the codebase.

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageMention: {
      /**
       * Insert a page-mention chip at the current cursor position.
       * Replaces any active text selection.
       *
       * @param attrs - `id`, `title`, and optional `icon` of the target document.
       */
      insertPageMention: (attrs: PageMentionAttrs) => ReturnType;
    };
  }
}

// ─── Extension ────────────────────────────────────────────────────────────────

export const PageMention = Node.create({
  name: 'pageMention',

  // Participates in the inline content flow (text, marks, other inline nodes).
  group: 'inline',
  inline: true,

  // `atom: true` makes ProseMirror treat the chip as a single indivisible unit.
  // The cursor cannot enter the node; keyboard navigation skips over it as a
  // whole, exactly like a character.
  atom: true,

  // Allow the node to be selected as a node-selection so it can be deleted or
  // replaced. `draggable: false` keeps drag-and-drop off by default.
  selectable: true,
  draggable: false,

  // ─── Attributes ────────────────────────────────────────────────────────────

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => ({ 'data-id': attributes.id }),
      },
      title: {
        default: 'Untitled',
        parseHTML: (element) =>
          element.getAttribute('data-title') ?? element.textContent?.trim() ?? 'Untitled',
        renderHTML: (attributes) => ({ 'data-title': attributes.title }),
      },
      icon: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-icon') || null,
        renderHTML: (attributes) =>
          attributes.icon ? { 'data-icon': attributes.icon } : {},
      },
    };
  },

  // ─── HTML parse rules ───────────────────────────────────────────────────────

  parseHTML() {
    return [{ tag: 'span[data-type="page-mention"]' }];
  },

  // ─── HTML render ────────────────────────────────────────────────────────────

  renderHTML({ node, HTMLAttributes }) {
    // Build the visible label: prepend icon with a trailing space when present.
    const label = node.attrs.icon
      ? `${node.attrs.icon} ${node.attrs.title}`
      : node.attrs.title;

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'page-mention',
        class: 'page-mention',
      }),
      label,
    ];
  },

  // ─── Commands ───────────────────────────────────────────────────────────────

  addCommands() {
    return {
      insertPageMention:
        (attrs: PageMentionAttrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs,
            })
            .run();
        },
    };
  },
});
