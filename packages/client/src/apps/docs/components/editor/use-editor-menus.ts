import { useState, useRef, useMemo, useCallback } from 'react';
import type { useEditor } from '@tiptap/react';
import { SLASH_COMMANDS } from './slash-commands';
import type { SlashCommandItem } from './slash-commands';

/**
 * Encapsulates all menu state and logic for slash commands, @ mentions,
 * and drawing/table embed pickers in the doc editor.
 */
export function useEditorMenus({
  editor,
  docList,
  drawingList,
  tableList,
  editorContainerRef,
}: {
  editor: ReturnType<typeof useEditor>;
  docList?: Array<{ id: string; title: string; icon: string | null }>;
  drawingList?: Array<{ id: string; title: string }>;
  tableList?: Array<{ id: string; title: string }>;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Slash menu state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashSelectedIdx, setSlashSelectedIdx] = useState(0);
  const slashStartRef = useRef<number | null>(null);

  // @ mention state
  const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
  const [mentionMenuPos, setMentionMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIdx, setMentionSelectedIdx] = useState(0);
  const mentionStartRef = useRef<number | null>(null);

  // Drawing embed picker state
  const [drawingPickerOpen, setDrawingPickerOpen] = useState(false);

  // Table embed picker state
  const [tablePickerOpen, setTablePickerOpen] = useState(false);

  // ── Slash menu ──

  function updateSlashMenuPosition(e: NonNullable<ReturnType<typeof useEditor>>) {
    try {
      const { from } = e.state.selection;
      const coords = e.view.coordsAtPos(from);
      const containerRect = editorContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setSlashMenuPos({
          top: coords.bottom - containerRect.top + 4,
          left: coords.left - containerRect.left,
        });
      }
    } catch {
      // Position may fail during transitions
    }
  }

  const closeSlashMenu = useCallback(() => {
    setSlashMenuOpen(false);
    setSlashQuery('');
    setSlashSelectedIdx(0);
    slashStartRef.current = null;
  }, []);

  // Dynamic slash commands (includes Drawing/Spreadsheet if those props are provided)
  const allSlashCommands = useMemo(() => {
    const cmds = [...SLASH_COMMANDS];
    if (drawingList && drawingList.length > 0) {
      cmds.push({
        title: 'Drawing',
        description: 'Embed an Excalidraw drawing',
        icon: '\u270F',
        command: () => { setDrawingPickerOpen(true); },
      });
    }
    if (tableList && tableList.length > 0) {
      cmds.push({
        title: 'Spreadsheet',
        description: 'Embed a linked spreadsheet',
        icon: '\u2637',
        command: () => { setTablePickerOpen(true); },
      });
    }
    return cmds;
  }, [drawingList, tableList]);

  function getFilteredCommands(query: string): SlashCommandItem[] {
    if (!query) return allSlashCommands;
    const q = query.toLowerCase();
    return allSlashCommands.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }

  function executeSlashCommand(item: SlashCommandItem) {
    if (!editor) return;
    if (slashStartRef.current !== null) {
      const { from } = editor.state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from: slashStartRef.current, to: from })
        .run();
    }
    item.command(editor);
    closeSlashMenu();
  }

  // ── @ mention ──

  function updateMentionMenuPosition(e: NonNullable<ReturnType<typeof useEditor>>) {
    try {
      const { from } = e.state.selection;
      const coords = e.view.coordsAtPos(from);
      const containerRect = editorContainerRef.current?.getBoundingClientRect();
      if (containerRect) {
        setMentionMenuPos({
          top: coords.bottom - containerRect.top + 4,
          left: coords.left - containerRect.left,
        });
      }
    } catch {
      // Position may fail during transitions
    }
  }

  const closeMentionMenu = useCallback(() => {
    setMentionMenuOpen(false);
    setMentionQuery('');
    setMentionSelectedIdx(0);
    mentionStartRef.current = null;
  }, []);

  function getFilteredMentions(query: string) {
    if (!docList) return [];
    if (!query) return docList.slice(0, 8);
    const q = query.toLowerCase();
    return docList.filter((d) => d.title.toLowerCase().includes(q)).slice(0, 8);
  }

  function executeMentionInsert(doc: { id: string; title: string; icon: string | null }) {
    if (!editor) return;
    if (mentionStartRef.current !== null) {
      const { from } = editor.state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from: mentionStartRef.current, to: from })
        .insertPageMention({ id: doc.id, title: doc.title, icon: doc.icon })
        .insertContent(' ')
        .run();
    }
    closeMentionMenu();
  }

  // ── Drawing/Table embed pickers ──

  function insertDrawingEmbed(drawing: { id: string; title: string }) {
    if (!editor) return;
    editor.chain().focus().insertDrawingEmbed({ drawingId: drawing.id, title: drawing.title }).run();
    setDrawingPickerOpen(false);
  }

  function insertTableEmbed(table: { id: string; title: string }) {
    if (!editor) return;
    editor.chain().focus().insertTableEmbed({ tableId: table.id, title: table.title }).run();
    setTablePickerOpen(false);
  }

  // ── onUpdate handler for slash/mention detection ──

  function handleEditorUpdate(e: NonNullable<ReturnType<typeof useEditor>>) {
    if (!e.isActive('codeBlock')) {
      const { from } = e.state.selection;
      const textBefore = e.state.doc.textBetween(
        Math.max(0, from - 50),
        from,
        '\0',
      );
      const slashMatch = textBefore.match(/\/([a-zA-Z0-9 ]*)$/);

      if (slashMatch) {
        if (!slashMenuOpen) {
          slashStartRef.current = from - slashMatch[0].length;
        }
        setSlashQuery(slashMatch[1]);
        setSlashSelectedIdx(0);
        setSlashMenuOpen(true);
        updateSlashMenuPosition(e);
      } else if (slashMenuOpen) {
        closeSlashMenu();
      }

      const atMatch = textBefore.match(/@([^@\n]*)$/);
      if (atMatch && docList && docList.length > 0) {
        if (!mentionMenuOpen) {
          mentionStartRef.current = from - atMatch[0].length;
        }
        setMentionQuery(atMatch[1]);
        setMentionSelectedIdx(0);
        setMentionMenuOpen(true);
        updateMentionMenuPosition(e);
      } else if (mentionMenuOpen) {
        closeMentionMenu();
      }
    }
  }

  // ── handleKeyDown for slash/mention keyboard nav ──

  function handleMenuKeyDown(event: KeyboardEvent): boolean {
    if (slashMenuOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashSelectedIdx((prev) => {
          const items = getFilteredCommands(slashQuery);
          return (prev + 1) % items.length;
        });
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashSelectedIdx((prev) => {
          const items = getFilteredCommands(slashQuery);
          return (prev - 1 + items.length) % items.length;
        });
        return true;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const items = getFilteredCommands(slashQuery);
        if (items[slashSelectedIdx]) {
          executeSlashCommand(items[slashSelectedIdx]);
        }
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSlashMenu();
        return true;
      }
    }
    if (mentionMenuOpen) {
      const mentionItems = getFilteredMentions(mentionQuery);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMentionSelectedIdx((prev) => (prev + 1) % Math.max(mentionItems.length, 1));
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setMentionSelectedIdx((prev) => (prev - 1 + mentionItems.length) % Math.max(mentionItems.length, 1));
        return true;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (mentionItems[mentionSelectedIdx]) {
          executeMentionInsert(mentionItems[mentionSelectedIdx]);
        }
        return true;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMentionMenu();
        return true;
      }
    }
    return false;
  }

  return {
    // Slash menu
    slashMenuOpen,
    slashMenuPos,
    slashQuery,
    slashSelectedIdx,
    closeSlashMenu,
    getFilteredCommands,
    executeSlashCommand,
    // Mention menu
    mentionMenuOpen,
    mentionMenuPos,
    mentionQuery,
    mentionSelectedIdx,
    closeMentionMenu,
    getFilteredMentions,
    executeMentionInsert,
    // Pickers
    drawingPickerOpen,
    setDrawingPickerOpen,
    tablePickerOpen,
    setTablePickerOpen,
    insertDrawingEmbed,
    insertTableEmbed,
    // Handlers for useEditor config
    handleEditorUpdate,
    handleMenuKeyDown,
  };
}
