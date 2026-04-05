import React from 'react';
import { Star, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { getFileTypeIcon, formatBytes, formatRelativeDate, isImageFile } from '../../../lib/drive-utils';
import { getTokenParam, stripExtension } from '../lib/helpers';
import type { DriveItem } from '@atlasmail/shared';
import type { SidebarView } from '../lib/types';
import type { Dispatch, SetStateAction, ReactNode } from 'react';

interface DriveGridViewProps {
  displayItems: DriveItem[];
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  renameId: string | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  setRenameId: (id: string | null) => void;
  handleRenameSubmit: () => void;
  handleItemClick: (item: DriveItem, e: React.MouseEvent) => void;
  handleItemDoubleClick: (item: DriveItem) => void;
  handleContextMenu: (e: React.MouseEvent, item: DriveItem) => void;
  handleItemDragStart: (e: React.DragEvent, item: DriveItem) => void;
  handleItemDragEnd: () => void;
  handleFolderDragOver: (e: React.DragEvent, folderId: string) => void;
  handleFolderDragLeave: (e: React.DragEvent) => void;
  handleFolderDrop: (e: React.DragEvent, targetFolderId: string) => void;
  dragOverFolderId: string | null;
  sidebarView: SidebarView;
  tenantUsersData: import('@atlasmail/shared').TenantUser[];
  driveSettings: { showThumbnails: boolean; showFileExtensions: boolean };
  renderTags: (item: DriveItem) => ReactNode;
}

export function DriveGridView({
  displayItems,
  selectedIds,
  setSelectedIds,
  renameId,
  renameValue,
  setRenameValue,
  setRenameId,
  handleRenameSubmit,
  handleItemClick,
  handleItemDoubleClick,
  handleContextMenu,
  handleItemDragStart,
  handleItemDragEnd,
  handleFolderDragOver,
  handleFolderDragLeave,
  handleFolderDrop,
  dragOverFolderId,
  sidebarView,
  tenantUsersData,
  driveSettings,
  renderTags,
}: DriveGridViewProps) {
  const { t } = useTranslation();

  return (
    <div className="drive-grid">
      {displayItems.map((item) => {
        const Icon = getFileTypeIcon(item.mimeType, item.type, item.linkedResourceType);

        const isSelected = selectedIds.has(item.id);
        const isRenaming = renameId === item.id;
        const showThumb = driveSettings.showThumbnails && isImageFile(item.mimeType) && item.storagePath;
        const isDragTarget = dragOverFolderId === item.id;

        return (
          <div
            key={item.id}
            className={`drive-grid-card ${isSelected ? 'selected' : ''} ${isDragTarget ? 'drive-drag-over' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleItemClick(item, e); }}
            onDoubleClick={() => handleItemDoubleClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
            draggable={!isRenaming}
            onDragStart={(e) => handleItemDragStart(e, item)}
            onDragEnd={handleItemDragEnd}
            onDragOver={item.type === 'folder' ? (e) => handleFolderDragOver(e, item.id) : undefined}
            onDragLeave={item.type === 'folder' ? handleFolderDragLeave : undefined}
            onDrop={item.type === 'folder' ? (e) => handleFolderDrop(e, item.id) : undefined}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              className="drive-checkbox drive-grid-checkbox"
              aria-label={`Select ${item.name}`}
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.id)) next.delete(item.id);
                  else next.add(item.id);
                  return next;
                });
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="drive-grid-card-icon">
              {showThumb ? (
                <img
                  src={`/api/v1/uploads/${item.storagePath}${getTokenParam()}`}
                  alt={item.name}
                  className="drive-grid-card-thumbnail"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : item.type === 'folder' && item.icon ? (
                <span style={{ fontSize: 42, lineHeight: 1 }}>{item.icon}</span>
              ) : (
                <Icon size={42} />
              )}
            </div>
            {isRenaming ? (
              <input
                className="drive-rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setRenameId(null);
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                style={{ textAlign: 'center' }}
              />
            ) : (
              <span className="drive-grid-card-name">{driveSettings.showFileExtensions ? item.name : stripExtension(item.name, item.type)}</span>
            )}
            <span className="drive-grid-card-meta">
              {item.type === 'file' ? formatBytes(item.size) : `${formatRelativeDate(item.updatedAt)}`}
              {((item as any).shareCount > 0 || (item as any).hasShareLink) && (
                <span style={{ marginLeft: 4, color: 'var(--color-text-tertiary)' }}><Users size={10} /></span>
              )}
            </span>
            {sidebarView === 'shared' && (() => {
              const sharedItem = item as DriveItem & { sharePermission?: string; sharedBy?: string };
              const sharer = (tenantUsersData ?? []).find((u) => u.userId === sharedItem.sharedBy);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', justifyContent: 'center', marginTop: 2 }}>
                  {sharer && <Avatar name={sharer.name || null} email={sharer.email} size={14} />}
                  <Badge variant={sharedItem.sharePermission === 'edit' ? 'primary' : 'default'}>
                    {sharedItem.sharePermission === 'edit' ? t('drive.sharing.shareEdit') : t('drive.sharing.shareView')}
                  </Badge>
                </div>
              );
            })()}
            {renderTags(item)}
            {item.isFavourite && (
              <Star size={12} fill="var(--color-star, #f59e0b)" color="var(--color-star, #f59e0b)" style={{ position: 'absolute', top: 8, right: 8 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
