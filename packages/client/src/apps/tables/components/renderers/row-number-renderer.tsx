import { useState } from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import { CheckSquare, Plus } from 'lucide-react';

// ─── Row number header (select-all checkbox) ───────────────────────

export function RowNumberHeader(props: { api: { selectAll: () => void; deselectAll: () => void; getSelectedRows: () => unknown[] } }) {
  const [allSelected, setAllSelected] = useState(false);
  const toggle = () => {
    if (allSelected) {
      props.api.deselectAll();
    } else {
      props.api.selectAll();
    }
    setAllSelected(!allSelected);
  };
  return (
    <span className="tables-row-number-header" onClick={toggle}>
      {allSelected ? <CheckSquare size={14} /> : <span className="tables-row-cb-empty" />}
    </span>
  );
}

// ─── Add column header ("+") ────────────────────────────────────────

export function AddColumnHeader(props: { setShowAddColumn: (v: boolean) => void }) {
  return (
    <div
      className="tables-add-column-header"
      onClick={() => props.setShowAddColumn(true)}
    >
      <Plus size={16} />
    </div>
  );
}
