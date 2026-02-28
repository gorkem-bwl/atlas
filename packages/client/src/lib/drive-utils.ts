import {
  FileText, FileImage, FileVideo, FileAudio, File, Folder,
  FileSpreadsheet, FileCode, FileArchive, Presentation,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Re-export the new SVG file type icon system
export { getFileTypeIcon } from '../components/drive/file-type-icons';

export function getFileIcon(mimeType: string | null, type: 'file' | 'folder'): LucideIcon {
  if (type === 'folder') return Folder;
  if (!mimeType) return File;

  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.startsWith('text/')) return FileText;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('xml') || mimeType.includes('html')) return FileCode;
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('rar') || mimeType.includes('7z')) return FileArchive;
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('rtf')) return FileText;

  return File;
}

export function getFileIconColor(mimeType: string | null, type: 'file' | 'folder'): string {
  if (type === 'folder') return '#64748b';
  if (!mimeType) return 'var(--color-text-tertiary)';

  if (mimeType.startsWith('image/')) return '#e06c9f';
  if (mimeType.startsWith('video/')) return '#8b5cf6';
  if (mimeType.startsWith('audio/')) return '#f59e0b';
  if (mimeType.includes('pdf')) return '#ef4444';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '#22c55e';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '#f97316';
  if (mimeType.includes('document') || mimeType.includes('word')) return '#3b82f6';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return '#78716c';

  return 'var(--color-text-tertiary)';
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '—';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);

  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function isImageFile(mimeType: string | null): boolean {
  return !!mimeType && mimeType.startsWith('image/');
}
