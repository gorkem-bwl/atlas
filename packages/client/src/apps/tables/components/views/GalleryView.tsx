import { useMemo } from 'react';
import type { TableColumn, TableRow } from '@atlasmail/shared';
import { getTagColor } from '../../../../lib/tag-colors';

export function GalleryView({
  columns,
  rows,
  onExpandRow,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  onExpandRow: (rowId: string) => void;
}) {
  // Gallery: title column (first text col)
  const galleryTitleCol = useMemo(
    () => columns.find((c) => c.type === 'text') || columns[0],
    [columns],
  );

  return (
    <div className="tables-gallery-view">
      {rows.map((row) => {
        const title = galleryTitleCol ? String(row[galleryTitleCol.id] || '') : row._id.slice(0, 8);
        const displayCols = columns
          .filter((c) => c.id !== galleryTitleCol?.id && row[c.id] != null && row[c.id] !== '')
          .slice(0, 5);
        return (
          <button
            key={row._id}
            className="tables-gallery-card"
            onClick={() => onExpandRow(row._id)}
          >
            <div className="tables-gallery-card-title">{title || 'Untitled'}</div>
            <div className="tables-gallery-card-fields">
              {displayCols.map((col) => {
                const val = row[col.id];
                let rendered: React.ReactNode = String(val);
                if (col.type === 'singleSelect') {
                  const c = getTagColor(String(val));
                  rendered = <span className="tables-cell-tag" style={{ background: c.bg, color: c.text }}>{String(val)}</span>;
                } else if (col.type === 'currency') {
                  const num = Number(val);
                  rendered = !isNaN(num) ? `$${num.toFixed(2)}` : String(val);
                } else if (col.type === 'percent') {
                  rendered = `${val}%`;
                } else if (col.type === 'multiSelect' && Array.isArray(val)) {
                  rendered = (
                    <div className="tables-cell-multi-tags">
                      {(val as string[]).map((v, i) => {
                        const c = getTagColor(v);
                        return <span key={i} className="tables-cell-tag" style={{ background: c.bg, color: c.text }}>{v}</span>;
                      })}
                    </div>
                  );
                }
                return (
                  <div key={col.id} className="tables-gallery-card-field">
                    <span className="tables-gallery-card-label">{col.name}</span>
                    <span className="tables-gallery-card-value">{rendered}</span>
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
