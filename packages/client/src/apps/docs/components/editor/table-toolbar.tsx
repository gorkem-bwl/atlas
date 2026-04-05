import type { useEditor } from '@tiptap/react';
import { Trash2 } from 'lucide-react';

// ─── Table toolbar (appears when cursor is inside a table) ──────────────

export function TableToolbar({
  editor,
  position,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  position: { top: number; left: number };
}) {
  return (
    <div
      className="table-toolbar"
      style={{ top: position.top, left: position.left }}
      // Prevent the toolbar clicks from stealing focus from the editor
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Row controls */}
      <button
        className="table-toolbar-btn"
        title="Add row above"
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        +Row ↑
      </button>
      <button
        className="table-toolbar-btn"
        title="Add row below"
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        +Row ↓
      </button>
      <button
        className="table-toolbar-btn table-toolbar-btn--danger"
        title="Delete row"
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        −Row
      </button>

      <div className="table-toolbar-divider" />

      {/* Column controls */}
      <button
        className="table-toolbar-btn"
        title="Add column before"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        +Col ←
      </button>
      <button
        className="table-toolbar-btn"
        title="Add column after"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        +Col →
      </button>
      <button
        className="table-toolbar-btn table-toolbar-btn--danger"
        title="Delete column"
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        −Col
      </button>

      <div className="table-toolbar-divider" />

      {/* Delete table */}
      <button
        className="table-toolbar-btn table-toolbar-btn--danger"
        title="Delete table"
        onClick={() => editor.chain().focus().deleteTable().run()}
      >
        <Trash2 size={12} />
        <span>Table</span>
      </button>
    </div>
  );
}
