import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Copy, RotateCcw } from 'lucide-react';
import { IconButton } from '../../../components/ui/icon-button';
import type { Drawing } from '@atlasmail/shared';

function SidebarButton({
  icon,
  onClick,
  tooltip,
  disabled,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip?: string;
  disabled?: boolean;
}) {
  return (
    <IconButton
      icon={icon}
      label={tooltip || ''}
      tooltip={!!tooltip}
      tooltipSide="bottom"
      size={26}
      onClick={onClick}
      disabled={disabled}
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    />
  );
}

export { SidebarButton };

export function DrawingListItem({
  drawing,
  isSelected,
  onClick,
  onDelete,
  onRestore,
  onDuplicate,
  isTrash,
}: {
  drawing: Drawing;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onDuplicate?: () => void;
  isTrash?: boolean;
}) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  const bg = isSelected
    ? 'var(--color-surface-selected)'
    : hovered
      ? 'var(--color-surface-hover)'
      : 'transparent';

  const updatedLabel = new Date(drawing.updatedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const actionCount = (onDelete ? 1 : 0) + (onRestore ? 1 : 0) + (onDuplicate ? 1 : 0);

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '7px 8px',
          paddingRight: hovered && actionCount > 0 ? 8 + actionCount * 28 : 8,
          background: bg,
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          transition: 'background 0.12s ease',
          textAlign: 'left',
          fontFamily: 'var(--font-family)',
        }}
      >
        {drawing.thumbnailUrl ? (
          <img
            src={drawing.thumbnailUrl}
            alt=""
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              objectFit: 'cover',
              flexShrink: 0,
              border: '1px solid var(--color-border-secondary)',
            }}
          />
        ) : (
          <Pencil
            size={14}
            style={{
              flexShrink: 0,
              color: isSelected ? 'var(--color-accent-primary)' : 'var(--color-text-tertiary)',
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: isSelected ? 600 : 400,
              color: 'var(--color-text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {drawing.title || t('draw.untitled')}
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-tertiary)',
              marginTop: 1,
            }}
          >
            {updatedLabel}
          </div>
        </div>
      </button>

      {/* Hover actions */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: 2,
          }}
        >
          {!isTrash && onDuplicate && (
            <SidebarButton
              icon={<Copy size={12} />}
              onClick={onDuplicate}
              tooltip={t('draw.duplicate')}
            />
          )}
          {isTrash && onRestore && (
            <SidebarButton
              icon={<RotateCcw size={12} />}
              onClick={onRestore}
              tooltip={t('draw.restore')}
            />
          )}
          {onDelete && (
            <SidebarButton
              icon={<Trash2 size={12} />}
              onClick={onDelete}
              tooltip={isTrash ? t('draw.delete') : t('draw.trash')}
            />
          )}
        </div>
      )}
    </div>
  );
}
