/**
 * Callout block extension for Tiptap v2.
 *
 * Usage in editor setup:
 *   import { Callout } from './extensions/callout';
 *   extensions: [ ..., Callout ]
 *
 * Commands:
 *   editor.chain().focus().setCallout({ type: 'warning' }).run()
 *   editor.chain().focus().toggleCallout({ type: 'info' }).run()
 *
 * Input rules (type at start of an empty line, followed by a space):
 *   :::info      → info callout
 *   :::warning   → warning callout
 *   :::success   → success callout
 *   :::error     → error callout
 *
 * Keyboard shortcuts:
 *   Backspace at the very start of an empty callout → lifts (unwraps) it
 *   Enter on a trailing empty paragraph inside a callout → exits callout
 */

import { Node, mergeAttributes, wrappingInputRule } from '@tiptap/core';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CalloutType = 'info' | 'warning' | 'success' | 'error';

// ─── Command augmentation ───────────────────────────────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Wrap the current block in a callout of the given type.
       * Defaults to 'info' if no attrs are provided.
       */
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType;
      /**
       * Toggle a callout around the current block. If the cursor is already
       * inside a callout, the callout is removed (lifted). Otherwise it is set.
       */
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType;
    };
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const CALLOUT_TYPES: CalloutType[] = ['info', 'warning', 'success', 'error'];

// ─── Extension ──────────────────────────────────────────────────────────────────

export const Callout = Node.create({
  name: 'callout',

  // Part of the block group so it can appear anywhere a block can.
  group: 'block',

  // A callout wraps one or more block nodes (paragraphs, headings, lists, etc.).
  content: 'block+',

  // `defining: true` means the node defines the structure of its content and
  // Tiptap/ProseMirror will keep the wrapper when pasting or splitting content.
  defining: true,

  // ─── Attributes ─────────────────────────────────────────────────────────────

  addAttributes() {
    return {
      type: {
        default: 'info' satisfies CalloutType,
        // Allow parsing from both the data-callout-type attribute and the
        // legacy class name pattern (e.g., `callout-warning`).
        parseHTML: (element) => {
          const fromAttr = element.getAttribute('data-callout-type');
          if (fromAttr && CALLOUT_TYPES.includes(fromAttr as CalloutType)) {
            return fromAttr as CalloutType;
          }
          for (const t of CALLOUT_TYPES) {
            if (element.classList.contains(`callout-${t}`)) return t;
          }
          return 'info';
        },
        renderHTML: (attributes) => ({
          'data-callout-type': attributes.type ?? 'info',
        }),
      },
    };
  },

  // ─── HTML parse rules ────────────────────────────────────────────────────────

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout"]',
      },
    ];
  },

  // ─── HTML render ────────────────────────────────────────────────────────────

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'callout',
        // data-callout-type is already injected via renderHTML in addAttributes
        class: `callout callout-${HTMLAttributes['data-callout-type'] ?? 'info'}`,
      }),
      0, // content hole — children go here
    ];
  },

  // ─── Commands ────────────────────────────────────────────────────────────────

  addCommands() {
    return {
      setCallout:
        (attrs = {}) =>
        ({ chain }) => {
          const type: CalloutType = attrs.type ?? 'info';
          return chain()
            .wrapIn(this.name, { type })
            .run();
        },

      toggleCallout:
        (attrs = {}) =>
        ({ chain, state }) => {
          const type: CalloutType = attrs.type ?? 'info';
          const isActive = state.selection.$from
            .node(-1)
            ?.type.name === this.name;

          if (isActive) {
            return chain().lift(this.name).run();
          }
          return chain().wrapIn(this.name, { type }).run();
        },
    };
  },

  // ─── Input rules ────────────────────────────────────────────────────────────

  addInputRules() {
    return CALLOUT_TYPES.map((calloutType) =>
      wrappingInputRule({
        // Each type gets its own rule so getAttributes can resolve statically.
        find: new RegExp(`^:::(${calloutType})\\s$`),
        type: this.type,
        getAttributes: () => ({ type: calloutType }),
      }),
    );
  },

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────────

  addKeyboardShortcuts() {
    return {
      /**
       * Backspace at the very start of the first (possibly empty) block inside
       * a callout lifts the callout, placing the content back in the document.
       */
      Backspace: () => {
        const { state, chain } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        // Check whether the cursor is directly inside a callout.
        const parentDepth = $from.depth - 1;
        if (parentDepth < 0) return false;
        const parentNode = $from.node(parentDepth);
        if (parentNode.type.name !== this.name) return false;

        // Only act when the cursor is at position 0 inside its text block.
        if ($from.parentOffset !== 0) return false;

        // Only act when this is the first child of the callout.
        const calloutStart = $from.start(parentDepth);
        const firstChildStart = calloutStart + 1; // +1 for the opening token
        if ($from.start() !== firstChildStart) return false;

        return chain().lift(this.name).run();
      },

      /**
       * Enter on a trailing empty paragraph inside a callout exits the callout
       * by lifting that paragraph out (placing it after the callout).
       */
      Enter: () => {
        const { state, chain } = this.editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        // The immediate parent must be a paragraph (or other textblock).
        if ($from.parent.type.name !== 'paragraph') return false;

        // The paragraph must be empty.
        if ($from.parent.textContent !== '') return false;

        // Walk up to find if we are inside a callout.
        let calloutDepth = -1;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === this.name) {
            calloutDepth = d;
            break;
          }
        }
        if (calloutDepth === -1) return false;

        // Only exit when the empty paragraph is the last child of the callout.
        const calloutNode = $from.node(calloutDepth);
        const lastChild = calloutNode.lastChild;
        if (!lastChild) return false;
        if ($from.parent !== lastChild) return false;

        // Lift the empty paragraph out of the callout.
        return chain().lift(this.name).run();
      },
    };
  },
});
