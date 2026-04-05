import type { useEditor } from '@tiptap/react';

// ─── Slash command items ────────────────────────────────────────────────

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: NonNullable<ReturnType<typeof useEditor>>) => void;
}

// Helper: read a File as a base64 data URL
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain text block',
    icon: 'Aa',
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'To-do list',
    description: 'Track tasks with checkboxes',
    icon: '☑',
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Bullet list',
    description: 'Unordered list',
    icon: '•',
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered list',
    description: 'Ordered list with numbers',
    icon: '1.',
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: '"',
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal separator',
    icon: '—',
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: 'Code block',
    description: 'Code snippet',
    icon: '<>',
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Table',
    description: '3x3 table',
    icon: '▦',
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: 'Image',
    description: 'Upload a resizable image',
    icon: '🖼',
    command: (editor) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const src = await readFileAsDataUrl(file);
        editor.chain().focus().setResizableImage({ src }).run();
      };
      input.click();
    },
  },
  {
    title: 'Callout',
    description: 'Info callout block',
    icon: 'ℹ️',
    command: (editor) => editor.chain().focus().setCallout({ type: 'info' }).run(),
  },
  {
    title: 'Warning',
    description: 'Warning callout block',
    icon: '⚠️',
    command: (editor) => editor.chain().focus().setCallout({ type: 'warning' }).run(),
  },
  {
    title: 'Success',
    description: 'Success callout block',
    icon: '✅',
    command: (editor) => editor.chain().focus().setCallout({ type: 'success' }).run(),
  },
  {
    title: 'Error',
    description: 'Error callout block',
    icon: '🚫',
    command: (editor) => editor.chain().focus().setCallout({ type: 'error' }).run(),
  },
  {
    title: 'Table of contents',
    description: 'Insert a linked list of headings',
    icon: '≡',
    command: (editor) => {
      const headings: Array<{ level: number; text: string; id: string }> = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'heading') {
          headings.push({
            level: node.attrs.level as number,
            text: node.textContent,
            id: node.attrs.id || '',
          });
        }
      });
      if (headings.length === 0) {
        editor.chain().focus().insertContent('<p><em>No headings found in this document.</em></p>').run();
        return;
      }
      // Build nested bullet list items
      const items = headings.map((h) => {
        const padding = (h.level - 1) * 16;
        return `<li style="padding-left: ${padding}px; list-style: none;"><a href="#${h.id}" style="color: var(--color-text-secondary); text-decoration: none;">${h.text}</a></li>`;
      });
      const tocHtml = `<p><strong>Table of contents</strong></p><ul style="padding-left: 0;">${items.join('')}</ul>`;
      editor.chain().focus().insertContent(tocHtml).run();
    },
  },
];
