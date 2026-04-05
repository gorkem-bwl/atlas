import type { ICellRendererParams } from 'ag-grid-community';
import type { ColDef } from 'ag-grid-community';
import { ExternalLink, Paperclip, FileIcon } from 'lucide-react';
import type { TableAttachment } from '@atlasmail/shared';
import { getTagColor } from '../../../../lib/tag-colors';

export function TagRenderer(params: ICellRendererParams) {
  if (!params.value) return null;
  const c = getTagColor(String(params.value));
  return (
    <span className="tables-cell-tag" style={{ background: c.bg, color: c.text }}>
      {String(params.value)}
    </span>
  );
}

export function MultiTagRenderer(params: ICellRendererParams) {
  const values = Array.isArray(params.value) ? params.value : [];
  if (values.length === 0) return null;
  return (
    <div className="tables-cell-multi-tags">
      {values.map((v: string, i: number) => {
        const c = getTagColor(v);
        return (
          <span key={i} className="tables-cell-tag" style={{ background: c.bg, color: c.text }}>
            {v}
          </span>
        );
      })}
    </div>
  );
}

export function LinkRenderer(params: ICellRendererParams) {
  if (!params.value) return null;
  const url = String(params.value);
  let href: string;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return <span>{url}</span>;
    href = parsed.href;
  } catch {
    return <span>{url}</span>;
  }
  return (
    <span className="tables-cell-url">
      <span className="tables-cell-url-text">{url}</span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="tables-cell-url-open"
        title="Open link"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink size={12} />
      </a>
    </span>
  );
}

export function EmailRenderer(params: ICellRendererParams) {
  if (!params.value) return null;
  return (
    <a href={`mailto:${params.value}`} className="tables-cell-link" onClick={(e) => e.stopPropagation()}>
      {String(params.value)}
    </a>
  );
}

export function CurrencyRenderer(params: ICellRendererParams) {
  if (params.value == null || params.value === '') return null;
  const num = Number(params.value);
  if (isNaN(num)) return <span>{String(params.value)}</span>;
  const symbol = (params.colDef as ColDef & { cellRendererParams?: { currencySymbol?: string } })?.cellRendererParams?.currencySymbol || '$';
  return <span>{symbol}{num.toFixed(2)}</span>;
}

export function StarRenderer(params: ICellRendererParams) {
  const val = Number(params.value) || 0;
  return (
    <div className="tables-cell-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`tables-cell-star ${i <= val ? '' : 'empty'}`}>&#9733;</span>
      ))}
    </div>
  );
}

export function PercentRenderer(params: ICellRendererParams) {
  if (params.value == null || params.value === '') return null;
  const val = Math.min(100, Math.max(0, Number(params.value) || 0));
  return (
    <div className="tables-cell-percent">
      <div className="tables-cell-percent-bar">
        <div className="tables-cell-percent-fill" style={{ width: `${val}%` }} />
      </div>
      <span>{val}%</span>
    </div>
  );
}

export function AttachmentCellRenderer(params: ICellRendererParams) {
  const attachments: TableAttachment[] = Array.isArray(params.value) ? params.value : [];
  if (attachments.length === 0) {
    return (
      <span className="tables-cell-attachment tables-cell-attachment-empty">
        <Paperclip size={13} />
      </span>
    );
  }
  const isImage = (type: string) => type.startsWith('image/');
  const token = localStorage.getItem('atlasmail_token') || '';
  return (
    <div className="tables-cell-attachment">
      {attachments.map((att, i) => (
        <a
          key={i}
          className="tables-cell-attachment-chip"
          href={`${att.url}?token=${token}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={att.name}
        >
          {isImage(att.type) ? (
            <img className="tables-cell-attachment-img" src={`${att.url}?token=${token}`} alt={att.name} />
          ) : (
            <FileIcon size={12} />
          )}
          <span className="tables-cell-attachment-name">{att.name}</span>
        </a>
      ))}
    </div>
  );
}

export function formatDateByPattern(d: Date, pattern: string): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  switch (pattern) {
    case 'DD/MM/YYYY': return `${dd}/${mm}/${yyyy}`;
    case 'YYYY-MM-DD': return `${yyyy}-${mm}-${dd}`;
    default: return `${mm}/${dd}/${yyyy}`;
  }
}

export function DateRenderer(params: ICellRendererParams) {
  if (!params.value) return null;
  const d = new Date(String(params.value));
  if (isNaN(d.getTime())) return <span>{String(params.value)}</span>;
  const fmt = (params.colDef as ColDef & { cellRendererParams?: { dateFormat?: string } })?.cellRendererParams?.dateFormat || 'MM/DD/YYYY';
  return <span>{formatDateByPattern(d, fmt)}</span>;
}
