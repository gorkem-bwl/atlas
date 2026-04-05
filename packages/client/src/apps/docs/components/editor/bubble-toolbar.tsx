import { useState, useCallback, useRef, useEffect } from 'react';
import type { useEditor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Highlighter,
  Link as LinkIcon,
  Type,
  Undo2,
  Redo2,
  Palette,
} from 'lucide-react';

// ─── Text color palette ──────────────────────────────────────────────────
export const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'Brown', value: '#92400e' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Yellow', value: '#ca8a04' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Indigo', value: '#4f46e5' },
];

// ─── Bubble toolbar (floating on selection) ─────────────────────────────

export function BubbleToolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  useEffect(() => {
    if (!showColorPicker) return;
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColorPicker]);

  return (
    <div className="bubble-menu">
      {/* Undo / Redo */}
      <BubbleBtn
        icon={<Undo2 size={16} />}
        active={false}
        onClick={() => editor.chain().focus().undo().run()}
        tooltip="Undo"
      />
      <BubbleBtn
        icon={<Redo2 size={16} />}
        active={false}
        onClick={() => editor.chain().focus().redo().run()}
        tooltip="Redo"
      />
      <div className="bubble-menu-divider" />
      <BubbleBtn
        icon={<Bold size={16} />}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        tooltip="Bold"
      />
      <BubbleBtn
        icon={<Italic size={16} />}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        tooltip="Italic"
      />
      <BubbleBtn
        icon={<UnderlineIcon size={16} />}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        tooltip="Underline"
      />
      <BubbleBtn
        icon={<Strikethrough size={16} />}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        tooltip="Strikethrough"
      />
      <BubbleBtn
        icon={<Code size={16} />}
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        tooltip="Code"
      />
      <div className="bubble-menu-divider" />
      <BubbleBtn
        icon={<Highlighter size={16} />}
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        tooltip="Highlight"
      />
      {/* Color picker */}
      <div ref={colorRef} style={{ position: 'relative' }}>
        <BubbleBtn
          icon={<Palette size={16} />}
          active={showColorPicker}
          onClick={() => setShowColorPicker((v) => !v)}
          tooltip="Text color"
        />
        {showColorPicker && (
          <div className="color-picker-popover">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                className={`color-picker-swatch ${editor.isActive('textStyle', { color: c.value }) ? 'is-active' : ''}`}
                title={c.label}
                style={{ background: c.value || 'var(--color-text-primary)' }}
                onClick={() => {
                  if (c.value) {
                    editor.chain().focus().setColor(c.value).run();
                  } else {
                    editor.chain().focus().unsetColor().run();
                  }
                  setShowColorPicker(false);
                }}
              />
            ))}
          </div>
        )}
      </div>
      <BubbleBtn
        icon={<LinkIcon size={16} />}
        active={editor.isActive('link')}
        onClick={addLink}
        tooltip="Link"
      />
      <div className="bubble-menu-divider" />
      <BubbleBtn
        icon={<Type size={16} />}
        active={editor.isActive('paragraph')}
        onClick={() => editor.chain().focus().setParagraph().run()}
        tooltip="Text"
      />
      <BubbleBtn
        icon={<Heading1 size={16} />}
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        tooltip="Heading 1"
      />
      <BubbleBtn
        icon={<Heading2 size={16} />}
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        tooltip="Heading 2"
      />
      <BubbleBtn
        icon={<Heading3 size={16} />}
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        tooltip="Heading 3"
      />
      <div className="bubble-menu-divider" />
      <BubbleBtn
        icon={<List size={16} />}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        tooltip="Bullet list"
      />
      <BubbleBtn
        icon={<ListOrdered size={16} />}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        tooltip="Numbered list"
      />
      <BubbleBtn
        icon={<ListChecks size={16} />}
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        tooltip="To-do list"
      />
    </div>
  );
}

export function BubbleBtn({
  icon,
  active,
  onClick,
  tooltip,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`bubble-menu-btn ${active ? 'is-active' : ''}`}
    >
      {icon}
    </button>
  );
}
