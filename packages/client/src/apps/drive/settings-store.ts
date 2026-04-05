import { createAppSettingsStore } from '../../lib/create-app-settings-store';

export type DriveDefaultView = 'list' | 'grid';
export type DriveDefaultSort = 'default' | 'name' | 'size' | 'date' | 'type';
export type DriveSidebarDefault = 'files' | 'favourites' | 'recent';
export type DriveMaxVersions = 5 | 10 | 20 | 50;
export type DriveShareDefaultExpiry = 'never' | '1' | '7' | '30';
export type DriveDuplicateHandling = 'rename' | 'replace' | 'ask';
export type DriveSortOrder = 'asc' | 'desc';

export interface DriveSettings {
  defaultView: DriveDefaultView;
  defaultSort: DriveDefaultSort;
  sidebarDefault: DriveSidebarDefault;
  showPreviewPanel: boolean;
  compactMode: boolean;
  confirmDelete: boolean;
  autoVersionOnReplace: boolean;
  maxVersions: DriveMaxVersions;
  shareDefaultExpiry: DriveShareDefaultExpiry;
  duplicateHandling: DriveDuplicateHandling;
  showThumbnails: boolean;
  showFileExtensions: boolean;
  sortOrder: DriveSortOrder;
}

const { useStore: useDriveSettingsStore, useSync: useDriveSettingsSync } = createAppSettingsStore<DriveSettings>({
  defaults: {
    defaultView: 'list',
    defaultSort: 'default',
    sidebarDefault: 'files',
    showPreviewPanel: true,
    compactMode: false,
    confirmDelete: true,
    autoVersionOnReplace: true,
    maxVersions: 20,
    shareDefaultExpiry: 'never',
    duplicateHandling: 'rename',
    showThumbnails: true,
    showFileExtensions: true,
    sortOrder: 'asc',
  },
  fieldMapping: {
    defaultView: 'driveDefaultView',
    defaultSort: 'driveDefaultSort',
    sidebarDefault: 'driveSidebarDefault',
    showPreviewPanel: 'driveShowPreviewPanel',
    compactMode: 'driveCompactMode',
    confirmDelete: 'driveConfirmDelete',
    autoVersionOnReplace: 'driveAutoVersionOnReplace',
    maxVersions: 'driveMaxVersions',
    shareDefaultExpiry: 'driveShareDefaultExpiry',
    duplicateHandling: 'driveDuplicateHandling',
    showThumbnails: 'driveShowThumbnails',
    showFileExtensions: 'driveShowFileExtensions',
    sortOrder: 'driveSortOrder',
  },
});

export { useDriveSettingsStore, useDriveSettingsSync };
