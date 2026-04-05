import { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  FileText,
  MoreHorizontal,
  Plus,
  Star,
} from 'lucide-react';
import { IconButton } from '../../../../components/ui/icon-button';
import { SidebarButton } from './sidebar-helpers';
import { DocContextMenu } from './context-menu';
import type { DocumentTreeNode } from '@atlasmail/shared';

// ─── TreeNode ───────────────────────────────────────────────────────────

export interface TreeNodeProps {
  node: DocumentTreeNode;
  depth: number;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  onNewSubPage: (parentId: string) => void;
  onMoveDocument: (draggedId: string, targetParentId: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isFavorite: boolean;
  allFavorites: string[];
  dragOverId: string | null;
  onDragOverChange: (id: string | null) => void;
}

export function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  onNewSubPage,
  onMoveDocument,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  isFavorite,
  allFavorites,
  dragOverId,
  onDragOverChange,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const justDroppedRef = useRef(false);
  const isSelected = node.id === selectedId;
  const hasChildren = node.children.length > 0;
  const isDragOver = dragOverId === node.id;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? expanded : undefined}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', node.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOverChange(node.id);
        }}
        onDragLeave={() => {
          if (dragOverId === node.id) onDragOverChange(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDragOverChange(null);
          const draggedId = e.dataTransfer.getData('text/plain');
          if (draggedId && draggedId !== node.id) {
            onMoveDocument(draggedId, node.id);
            setExpanded(true);
          }
          // Suppress stale click events that fire after a drop
          justDroppedRef.current = true;
          setTimeout(() => { justDroppedRef.current = false; }, 100);
        }}
        onDragEnd={() => {
          setHovered(false);
          setMenuOpen(false);
          onDragOverChange(null);
          justDroppedRef.current = true;
          setTimeout(() => { justDroppedRef.current = false; }, 100);
        }}
        onMouseEnter={() => { if (!justDroppedRef.current) setHovered(true); }}
        onMouseLeave={() => { setHovered(false); if (!menuOpen) setMenuOpen(false); }}
        onClick={() => { if (!justDroppedRef.current) onSelect(node.id); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          paddingLeft: 4 + depth * 16,
          paddingRight: 4,
          height: 28,
          cursor: 'pointer',
          borderRadius: 'var(--radius-sm)',
          margin: '0 4px',
          background: isSelected
            ? 'var(--color-surface-selected)'
            : isDragOver
              ? 'color-mix(in srgb, var(--color-accent-primary, #13715B) 10%, transparent)'
              : hovered
                ? 'var(--color-surface-hover)'
                : 'transparent',
          transition: 'background 0.1s ease',
          borderTop: isDragOver ? '2px solid var(--color-accent-primary, #13715B)' : '2px solid transparent',
        }}
      >
        {/* Expand toggle */}
        <IconButton
          icon={<ChevronRight size={12} />}
          label={expanded ? 'Collapse' : 'Expand'}
          size={20}
          tooltip={false}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          style={{
            visibility: hasChildren ? 'visible' : 'hidden',
            transition: 'transform 0.12s ease',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />

        {/* Icon */}
        <span
          style={{
            fontSize: 14,
            lineHeight: 1,
            width: 20,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {node.icon || (
            <FileText size={14} style={{ color: 'var(--color-text-tertiary)', verticalAlign: 'middle' }} />
          )}
        </span>

        {/* Title */}
        <span
          style={{
            flex: 1,
            marginLeft: 4,
            fontSize: 13,
            color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            fontWeight: isSelected ? 500 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {node.title || 'Untitled'}
        </span>

        {/* Favorite star indicator */}
        {isFavorite && !hovered && (
          <Star
            size={10}
            fill="var(--color-text-tertiary)"
            style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginLeft: 2 }}
          />
        )}

        {/* Hover actions */}
        {hovered && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
              marginLeft: 4,
            }}
          >
            <SidebarButton
              icon={<Plus size={12} />}
              onClick={() => { onNewSubPage(node.id); }}
              tooltip="Add sub-page"
            />
            <div ref={menuRef} style={{ position: 'relative' }}>
              <SidebarButton
                icon={<MoreHorizontal size={12} />}
                onClick={() => setMenuOpen((v) => !v)}
                tooltip="More actions"
              />
              {menuOpen && (
                <DocContextMenu
                  onDelete={() => { onDelete(node.id); setMenuOpen(false); }}
                  onDuplicate={() => { onDuplicate(node.id); setMenuOpen(false); }}
                  onToggleFavorite={() => { onToggleFavorite(node.id); setMenuOpen(false); }}
                  isFavorite={isFavorite}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onNewSubPage={onNewSubPage}
              onMoveDocument={onMoveDocument}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onToggleFavorite={onToggleFavorite}
              isFavorite={allFavorites.includes(child.id)}
              allFavorites={allFavorites}
              dragOverId={dragOverId}
              onDragOverChange={onDragOverChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
