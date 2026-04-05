import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

// ─── Trailing Node Extension ─────────────────────────────────────────────────
// Ensures there is always a paragraph at the end of the document so the
// user can always click past the last block to continue typing.
export const TrailingNode = Extension.create({
  name: 'trailingNode',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, _oldState, newState) => {
          const { doc, tr, schema } = newState;
          const lastNode = doc.lastChild;
          if (lastNode?.type.name !== 'paragraph' || lastNode.content.size !== 0) {
            // Only append if last node isn't an empty paragraph
            if (lastNode?.type.name !== 'paragraph') {
              const paragraph = schema.nodes.paragraph.create();
              return tr.insert(doc.content.size, paragraph);
            }
          }
          return null;
        },
      }),
    ];
  },
});
