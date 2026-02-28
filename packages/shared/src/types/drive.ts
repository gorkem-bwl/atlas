export interface DriveItem {
  id: string;
  accountId: string;
  userId: string;
  name: string;
  type: 'file' | 'folder';
  mimeType: string | null;
  size: number | null;
  parentId: string | null;
  storagePath: string | null;
  icon: string | null;
  linkedResourceType: 'document' | 'drawing' | 'spreadsheet' | null;
  linkedResourceId: string | null;
  isFavourite: boolean;
  isArchived: boolean;
  tags: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriveItemInput {
  name: string;
  type: 'file' | 'folder';
  parentId?: string | null;
  mimeType?: string | null;
  size?: number | null;
  storagePath?: string | null;
}

export interface UpdateDriveItemInput {
  name?: string;
  parentId?: string | null;
  icon?: string | null;
  isFavourite?: boolean;
  isArchived?: boolean;
  tags?: string[];
}

export interface DriveItemVersion {
  id: string;
  driveItemId: string;
  accountId: string;
  userId: string;
  name: string;
  mimeType: string | null;
  size: number | null;
  storagePath: string | null;
  createdAt: string;
}

export interface DriveShareLink {
  id: string;
  driveItemId: string;
  userId: string;
  shareToken: string;
  expiresAt: string | null;
  createdAt: string;
}
