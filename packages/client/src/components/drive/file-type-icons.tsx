import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

// Base file shape used by all file type icons
function FileBase({ size = 24, color, children, label }: IconProps & { children?: React.ReactNode; label?: string }) {
  const s = size;
  // Proportions based on 24x24 viewBox
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label={label}>
      {/* File body with folded corner */}
      <path
        d="M6 2h8.5L19 6.5V20a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"
        fill="white"
        stroke={color || '#94a3b8'}
        strokeWidth={1}
      />
      {/* Folded corner */}
      <path
        d="M14.5 2v4.5H19"
        fill={color ? `${color}22` : '#f1f5f9'}
        stroke={color || '#94a3b8'}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      {children}
    </svg>
  );
}

// PDF icon - red with "PDF" label
export function PdfIcon({ size = 24, color = '#ef4444' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="PDF">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="5" fontWeight="700" fontFamily="system-ui, sans-serif">PDF</text>
    </FileBase>
  );
}

// Word document icon - blue with horizontal lines
export function WordIcon({ size = 24, color = '#2b5797' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Word document">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="system-ui, sans-serif">DOC</text>
      <line x1="7" y1="9" x2="13" y2="9" stroke={color} strokeWidth={1} strokeLinecap="round" />
      <line x1="7" y1="11" x2="15" y2="11" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.5} />
    </FileBase>
  );
}

// Excel/Spreadsheet icon - green with grid
export function ExcelIcon({ size = 24, color = '#217346' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Spreadsheet">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="system-ui, sans-serif">XLS</text>
      {/* Mini grid */}
      <rect x="7" y="8" width="3" height="2" fill={color} opacity={0.3} rx={0.3} />
      <rect x="11" y="8" width="3" height="2" fill={color} opacity={0.3} rx={0.3} />
      <rect x="7" y="10.5" width="3" height="2" fill={color} opacity={0.15} rx={0.3} />
      <rect x="11" y="10.5" width="3" height="2" fill={color} opacity={0.15} rx={0.3} />
    </FileBase>
  );
}

// PowerPoint/Presentation icon - orange/red
export function PowerPointIcon({ size = 24, color = '#d24726' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Presentation">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="system-ui, sans-serif">PPT</text>
      {/* Mini slide shape */}
      <rect x="7" y="8" width="8" height="4.5" rx={0.5} fill="none" stroke={color} strokeWidth={0.8} opacity={0.5} />
      <circle cx="11" cy="10" r="1.2" fill={color} opacity={0.4} />
    </FileBase>
  );
}

// Image icon - pink/magenta with mountain/sun
export function ImageIcon({ size = 24, color = '#e06c9f' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Image">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="system-ui, sans-serif">IMG</text>
      {/* Sun */}
      <circle cx="9" cy="8.5" r="1.3" fill={color} opacity={0.4} />
      {/* Mountain */}
      <path d="M6.5 12.5 L10 9 L13.5 12.5" fill="none" stroke={color} strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
    </FileBase>
  );
}

// Video icon - purple with play button
export function VideoIcon({ size = 24, color = '#8b5cf6' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Video">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="system-ui, sans-serif">VID</text>
      {/* Play triangle */}
      <path d="M10 8 L10 12.5 L14 10.25 Z" fill={color} opacity={0.4} />
    </FileBase>
  );
}

// Audio icon - amber with music note
export function AudioIcon({ size = 24, color = '#f59e0b' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Audio">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="system-ui, sans-serif">MP3</text>
      {/* Music note */}
      <circle cx="9.5" cy="11.5" r="1.3" fill="none" stroke={color} strokeWidth={0.8} opacity={0.5} />
      <line x1="10.8" y1="11.5" x2="10.8" y2="7.5" stroke={color} strokeWidth={0.8} opacity={0.5} />
      <line x1="10.8" y1="7.5" x2="13" y2="8.5" stroke={color} strokeWidth={0.8} opacity={0.5} />
    </FileBase>
  );
}

// ZIP/Archive icon - stone/gray with zipper
export function ZipIcon({ size = 24, color = '#78716c' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Archive">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="system-ui, sans-serif">ZIP</text>
      {/* Zipper pattern */}
      <rect x="10.5" y="7" width="2" height="1.5" fill={color} opacity={0.25} rx={0.3} />
      <rect x="10.5" y="9" width="2" height="1.5" fill={color} opacity={0.25} rx={0.3} />
      <rect x="10.5" y="11" width="2" height="1.5" fill={color} opacity={0.25} rx={0.3} />
    </FileBase>
  );
}

// Code icon - teal with angle brackets
export function CodeIcon({ size = 24, color = '#0d9488' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Code">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4" fontWeight="700" fontFamily="system-ui, sans-serif">{'</>'}</text>
      {/* Code brackets */}
      <path d="M8.5 8.5 L6.5 10.25 L8.5 12" fill="none" stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
      <path d="M13.5 8.5 L15.5 10.25 L13.5 12" fill="none" stroke={color} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} />
    </FileBase>
  );
}

// Text/Document icon - slate blue with lines
export function TextIcon({ size = 24, color = '#3b82f6' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Text document">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="4.5" fontWeight="700" fontFamily="system-ui, sans-serif">TXT</text>
      <line x1="7" y1="8" x2="13" y2="8" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.4} />
      <line x1="7" y1="10" x2="15" y2="10" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.4} />
      <line x1="7" y1="12" x2="11" y2="12" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.25} />
    </FileBase>
  );
}

// Generic file icon - gray
export function GenericFileIcon({ size = 24, color = '#94a3b8' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="File">
      <line x1="7" y1="10" x2="13" y2="10" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.3} />
      <line x1="7" y1="12" x2="15" y2="12" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.3} />
      <line x1="7" y1="14" x2="11" y2="14" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.2} />
    </FileBase>
  );
}

// Atlas Document icon - branded
export function AtlasDocIcon({ size = 24, color = '#3b82f6' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Atlas document">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="3.8" fontWeight="700" fontFamily="system-ui, sans-serif">WRITE</text>
      <line x1="7" y1="8.5" x2="12" y2="8.5" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.4} />
      <line x1="7" y1="10.5" x2="14" y2="10.5" stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.3} />
    </FileBase>
  );
}

// Atlas Drawing icon - branded
export function AtlasDrawIcon({ size = 24, color = '#8b5cf6' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Atlas drawing">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="3.8" fontWeight="700" fontFamily="system-ui, sans-serif">DRAW</text>
      {/* Pencil */}
      <path d="M13.5 7 L15 8.5 L9.5 13 L8 13.5 L8.5 12 Z" fill="none" stroke={color} strokeWidth={0.8} opacity={0.5} />
    </FileBase>
  );
}

// Atlas Spreadsheet icon - branded
export function AtlasTableIcon({ size = 24, color = '#22c55e' }: IconProps) {
  return (
    <FileBase size={size} color={color} label="Atlas spreadsheet">
      <rect x="5" y="13" width="14" height="7" rx="1" fill={color} />
      <text x="12" y="18.5" textAnchor="middle" fill="white" fontSize="3.2" fontWeight="700" fontFamily="system-ui, sans-serif">TABLE</text>
      {/* Mini grid */}
      <rect x="7" y="8" width="3" height="2" fill={color} opacity={0.3} rx={0.3} />
      <rect x="11" y="8" width="3" height="2" fill={color} opacity={0.3} rx={0.3} />
      <rect x="7" y="10.5" width="3" height="2" fill={color} opacity={0.15} rx={0.3} />
      <rect x="11" y="10.5" width="3" height="2" fill={color} opacity={0.15} rx={0.3} />
    </FileBase>
  );
}

// Folder icon - slate with open folder shape
export function FolderIcon({ size = 24, color = '#64748b' }: IconProps) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Folder">
      <path
        d="M2 6a2 2 0 012-2h4.5l2 2H20a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        fill={`${color}20`}
        stroke={color}
        strokeWidth={1}
      />
      <path
        d="M2 10h20v8a2 2 0 01-2 2H4a2 2 0 01-2-2V10z"
        fill={`${color}30`}
      />
    </svg>
  );
}

// Map mimeType + linked resource type to the proper icon component
export function getFileTypeIcon(
  mimeType: string | null,
  type: 'file' | 'folder',
  linkedResourceType?: 'document' | 'drawing' | 'spreadsheet' | null,
): React.FC<IconProps> {
  // Linked Atlas resources
  if (linkedResourceType === 'document') return AtlasDocIcon;
  if (linkedResourceType === 'drawing') return AtlasDrawIcon;
  if (linkedResourceType === 'spreadsheet') return AtlasTableIcon;

  if (type === 'folder') return FolderIcon;
  if (!mimeType) return GenericFileIcon;

  if (mimeType.includes('pdf')) return PdfIcon;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return ExcelIcon;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return PowerPointIcon;
  if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('rtf')) return WordIcon;
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return VideoIcon;
  if (mimeType.startsWith('audio/')) return AudioIcon;
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip') || mimeType.includes('rar') || mimeType.includes('7z')) return ZipIcon;
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('xml') || mimeType.includes('html')) return CodeIcon;
  if (mimeType.startsWith('text/')) return TextIcon;

  return GenericFileIcon;
}
