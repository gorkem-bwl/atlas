import { Node, mergeAttributes } from '@tiptap/core';

// ─── Type augmentation ────────────────────────────────────────────────────────
//
// Extends the Tiptap Commands interface so `editor.commands.setToggleBlock()`
// is typed correctly throughout the codebase.

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      /**
       * Insert a collapsible toggle block at the current selection.
       * The block renders as a <details> / <summary> pair and ships with
       * an empty paragraph as the first body node so the cursor has
       * somewhere to land after insertion.
       */
      setToggleBlock: () => ReturnType;
    };
  }
}

// ─── ToggleSummary ────────────────────────────────────────────────────────────
//
// The clickable summary line rendered as <summary>…</summary>.
// Content is limited to inline nodes (text, marks) so it stays on one line.

export const ToggleSummary = Node.create({
  name: 'toggleSummary',

  // Inline content only — keeps the summary a single logical line.
  content: 'inline*',

  // Treat as a structural/defining node so Tiptap won't unwrap it on
  // operations that replace a block (e.g. pressing Enter at the start).
  defining: true,

  // Clicking the summary to toggle open/close is a native <details>
  // browser action; we don't want Tiptap's selection machinery to treat
  // this node as independently selectable in the usual block sense.
  selectable: false,

  parseHTML() {
    return [{ tag: 'summary' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes), 0];
  },
});

// ─── ToggleBlock ──────────────────────────────────────────────────────────────
//
// The outer container rendered as <details open?>…</details>.
// Content schema: one ToggleSummary node followed by zero or more block nodes.

export const ToggleBlock = Node.create({
  name: 'toggleBlock',

  // Participates in the standard block content flow (alongside paragraphs,
  // headings, lists, etc.).
  group: 'block',

  // Exactly one toggleSummary followed by any number of block nodes.
  content: 'toggleSummary block*',

  // Structural node — prevents Tiptap from merging or splitting across it
  // during standard editing commands.
  defining: true,

  // ─── Attributes ──────────────────────────────────────────────────────────

  addAttributes() {
    return {
      /**
       * Controls whether the <details> element is expanded.
       * Stored as a boolean; serialised as the presence/absence of the HTML
       * `open` attribute (mirrors native <details> behaviour).
       * Default: true — new toggles are expanded so the content is
       * immediately visible and editable.
       */
      open: {
        default: true,
        // Parse the HTML attribute: presence of `open` → true, absence → false.
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) => {
          // Only emit the attribute when the block is open; omitting it
          // causes the browser to render the <details> as collapsed.
          if (!attributes.open) return {};
          return { open: '' };
        },
      },
    };
  },

  // ─── HTML parsing ────────────────────────────────────────────────────────

  parseHTML() {
    return [{ tag: 'details' }];
  },

  // ─── HTML rendering ──────────────────────────────────────────────────────

  renderHTML({ HTMLAttributes }) {
    return [
      'details',
      mergeAttributes(HTMLAttributes, { class: 'toggle-block' }),
      0,
    ];
  },

  // ─── Commands ────────────────────────────────────────────────────────────

  addCommands() {
    return {
      setToggleBlock:
        () =>
        ({ commands }) => {
          // Insert a fully-formed toggle block:
          //   <details open>
          //     <summary></summary>
          //     <p></p>          ← gives the cursor a place to land
          //   </details>
          return commands.insertContent({
            type: this.name,
            attrs: { open: true },
            content: [
              {
                type: 'toggleSummary',
                content: [],
              },
              {
                type: 'paragraph',
                content: [],
              },
            ],
          });
        },
    };
  },

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  addKeyboardShortcuts() {
    return {
      /**
       * Enter inside the summary node:
       *   — Creates a new paragraph as the first block child of the toggle
       *     (moves focus into the body) rather than splitting the summary.
       *
       * This keeps the summary a single line, which matches the visual
       * contract of the toggle pattern (one headline, expandable body).
       */
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Only intercept when the cursor is inside a toggleSummary node.
        if ($from.parent.type.name !== 'toggleSummary') return false;

        // Find the position immediately after the toggleSummary node within
        // its toggleBlock parent so we can insert a paragraph there.
        const summaryDepth = $from.depth;
        const summaryEnd = $from.end(summaryDepth);

        return editor
          .chain()
          .insertContentAt(summaryEnd + 1, { type: 'paragraph', content: [] })
          .run();
      },

      /**
       * Backspace at the very start of an empty toggleSummary:
       *   — Lifts the entire toggleBlock out and replaces it with a plain
       *     paragraph, matching the "undo block type" UX of other nodes.
       */
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (
          !empty ||
          $from.parent.type.name !== 'toggleSummary' ||
          $from.parentOffset !== 0 ||
          $from.parent.textContent !== ''
        ) {
          return false;
        }

        return editor.chain().clearNodes().run();
      },
    };
  },
});
