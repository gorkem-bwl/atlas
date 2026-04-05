import { useEffect } from 'react';
import type { useEditor } from '@tiptap/react';
import type { SearchReplaceState } from '../extensions/search-replace';
import type { DocFontStyle } from '../../settings-store';

const DOC_FONT_FAMILIES: Record<DocFontStyle, string> = {
  default: 'var(--font-family)',
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
};

/**
 * Bundles all the useEffect hooks that synchronize editor state, settings,
 * and external event listeners for the doc editor.
 */
export function useEditorEffects({
  editor,
  readOnly,
  fontStyle,
  smallText,
  spellCheck,
  onNavigate,
  editorContainerRef,
  slashMenuOpen,
  closeSlashMenu,
  mentionMenuOpen,
  closeMentionMenu,
  floatingMenuOpen,
  setFloatingMenuOpen,
  setTableToolbarPos,
  setSearchOpen,
  setWordCount,
  setCharCount,
}: {
  editor: ReturnType<typeof useEditor>;
  readOnly: boolean;
  fontStyle: DocFontStyle;
  smallText: boolean;
  spellCheck: boolean;
  onNavigate?: (docId: string) => void;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  slashMenuOpen: boolean;
  closeSlashMenu: () => void;
  mentionMenuOpen: boolean;
  closeMentionMenu: () => void;
  floatingMenuOpen: boolean;
  setFloatingMenuOpen: (v: boolean) => void;
  setTableToolbarPos: React.Dispatch<React.SetStateAction<{ top: number; left: number } | null>>;
  setSearchOpen: (v: boolean) => void;
  setWordCount: (v: number) => void;
  setCharCount: (v: number) => void;
}) {
  // Sync readOnly
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Sync doc settings (font, text size, spell check) to the editor after mount
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          class: 'doc-editor-content',
          style: [
            'outline: none',
            'color: var(--color-text-primary)',
            `font-size: ${smallText ? '14px' : '15px'}`,
            'line-height: 1.7',
            `font-family: ${DOC_FONT_FAMILIES[fontStyle]}`,
            'min-height: 300px',
            'padding: 0',
          ].join('; '),
          spellcheck: spellCheck ? 'true' : 'false',
        },
      },
    });
  }, [editor, fontStyle, smallText, spellCheck]);

  // Store editor reference on the ProseMirror view for the Office paste handler
  useEffect(() => {
    if (editor) {
      (editor.view as any).__tiptapEditor = editor;
    }
  }, [editor]);

  // Sync search bar open state from the SearchReplace extension storage
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const s = editor.storage.searchReplace as SearchReplaceState | undefined;
      if (s) setSearchOpen(s.open);
    };
    editor.on('transaction', handler);
    return () => { editor.off('transaction', handler); };
  }, [editor, setSearchOpen]);

  // Initialize word/char count when editor first mounts
  useEffect(() => {
    if (!editor) return;
    const text = editor.state.doc.textContent;
    setCharCount(text.length);
    setWordCount(text.trim() === '' ? 0 : text.trim().split(/\s+/).length);
  }, [editor, setWordCount, setCharCount]);

  // Close slash menu on click outside
  useEffect(() => {
    if (!slashMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.slash-command-menu')) {
        closeSlashMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [slashMenuOpen, closeSlashMenu]);

  // Close mention menu on click outside
  useEffect(() => {
    if (!mentionMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.mention-menu')) {
        closeMentionMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mentionMenuOpen, closeMentionMenu]);

  // Close floating menu on click outside
  useEffect(() => {
    if (!floatingMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.floating-menu')) {
        setFloatingMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [floatingMenuOpen, setFloatingMenuOpen]);

  // Table toolbar: update position whenever the selection changes
  useEffect(() => {
    if (!editor) return;

    function updateTableToolbar() {
      if (!editor) return;
      if (!editor.isActive('table')) {
        setTableToolbarPos((prev) => prev === null ? prev : null);
        return;
      }
      try {
        const { from } = editor.state.selection;
        const containerRect = editorContainerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        const domAtPos = editor.view.domAtPos(from);
        let node: Node | null = domAtPos.node;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        let tableEl: HTMLElement | null = null;
        while (node && node !== editor.view.dom) {
          if ((node as HTMLElement).tagName === 'TABLE') {
            tableEl = node as HTMLElement;
            break;
          }
          node = (node as HTMLElement).parentElement;
        }

        if (tableEl) {
          const tableRect = tableEl.getBoundingClientRect();
          setTableToolbarPos({
            top: tableRect.top - containerRect.top - 40,
            left: tableRect.left - containerRect.left,
          });
        }
      } catch {
        // Position may fail during transitions
      }
    }

    editor.on('selectionUpdate', updateTableToolbar);
    editor.on('transaction', updateTableToolbar);
    return () => {
      editor.off('selectionUpdate', updateTableToolbar);
      editor.off('transaction', updateTableToolbar);
    };
  }, [editor, editorContainerRef, setTableToolbarPos]);

  // Click handler for page mentions to navigate
  useEffect(() => {
    if (!onNavigate || !editorContainerRef.current) return;
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('.page-mention');
      if (target) {
        e.preventDefault();
        const docId = target.getAttribute('data-id');
        if (docId) onNavigate(docId);
      }
    };
    const container = editorContainerRef.current;
    container.addEventListener('click', handler);
    return () => container.removeEventListener('click', handler);
  }, [onNavigate, editorContainerRef]);
}
