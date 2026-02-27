import { useRef, useState, useCallback } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import type { CellClickedEvent } from 'ag-grid-community';

// ─── Types ─────────────────────────────────────────────────────────

export interface CellCoord {
  rowIndex: number;
  colId: string;
}

export interface CellRange {
  anchor: CellCoord;
  end: CellCoord;
}

// ─── Utility ───────────────────────────────────────────────────────

export function isCellInRange(
  rowIndex: number,
  colId: string,
  range: CellRange,
  colIndexMap: Map<string, number>,
): boolean {
  const anchorCol = colIndexMap.get(range.anchor.colId);
  const endCol = colIndexMap.get(range.end.colId);
  const cellCol = colIndexMap.get(colId);
  if (anchorCol == null || endCol == null || cellCol == null) return false;

  const minRow = Math.min(range.anchor.rowIndex, range.end.rowIndex);
  const maxRow = Math.max(range.anchor.rowIndex, range.end.rowIndex);
  const minCol = Math.min(anchorCol, endCol);
  const maxCol = Math.max(anchorCol, endCol);

  return rowIndex >= minRow && rowIndex <= maxRow && cellCol >= minCol && cellCol <= maxCol;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useCellRangeSelection(
  gridRef: React.RefObject<AgGridReact | null>,
  excludedColIds?: Set<string>,
) {
  const rangeRef = useRef<CellRange | null>(null);
  const anchorRef = useRef<CellCoord | null>(null);
  const colIndexMapRef = useRef<Map<string, number>>(new Map());
  const [rangeVersion, setRangeVersion] = useState(0);

  // ── Helpers ────────────────────────────────────────────────────

  const refreshAllCells = useCallback(() => {
    gridRef.current?.api?.refreshCells({ force: true });
  }, [gridRef]);

  const bumpVersion = useCallback(() => {
    setRangeVersion((v) => v + 1);
  }, []);

  const setRange = useCallback(
    (range: CellRange | null) => {
      const hadRange = rangeRef.current != null;
      rangeRef.current = range;
      refreshAllCells();
      if ((range != null) !== hadRange) bumpVersion();
    },
    [refreshAllCells, bumpVersion],
  );

  const clearRange = useCallback(() => {
    if (rangeRef.current == null) return;
    setRange(null);
  }, [setRange]);

  // ── Column index map ──────────────────────────────────────────

  const rebuildColIndexMap = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const map = new Map<string, number>();
    const cols = api.getAllDisplayedColumns();
    cols.forEach((col, idx) => {
      const id = col.getColId();
      if (!excludedColIds?.has(id)) {
        map.set(id, idx);
      }
    });
    colIndexMapRef.current = map;
  }, [gridRef, excludedColIds]);

  // ── Compute selected cell count ───────────────────────────────

  const getSelectedCellCount = useCallback((): number => {
    const range = rangeRef.current;
    if (!range) return 0;
    const map = colIndexMapRef.current;
    const anchorCol = map.get(range.anchor.colId);
    const endCol = map.get(range.end.colId);
    if (anchorCol == null || endCol == null) return 0;
    const rowCount = Math.abs(range.end.rowIndex - range.anchor.rowIndex) + 1;
    const colCount = Math.abs(endCol - anchorCol) + 1;
    return rowCount * colCount;
  }, []);

  // ── Cell clicked handler ──────────────────────────────────────

  const handleCellClicked = useCallback(
    (event: CellClickedEvent) => {
      const colId = event.colDef.field;
      if (!colId || excludedColIds?.has(colId)) return;
      const rowIndex = event.rowIndex;
      if (rowIndex == null || event.node.rowPinned === 'bottom') return;

      const kbEvent = event.event as MouseEvent | undefined;

      if (kbEvent?.shiftKey && anchorRef.current) {
        // Shift+Click → create range from anchor to this cell
        const newRange: CellRange = {
          anchor: anchorRef.current,
          end: { rowIndex, colId },
        };
        setRange(newRange);
        // Clear row checkbox selection (mutual exclusion)
        gridRef.current?.api?.deselectAll();
      } else {
        // Normal click → set anchor, clear range
        anchorRef.current = { rowIndex, colId };
        clearRange();
      }
    },
    [gridRef, excludedColIds, setRange, clearRange],
  );

  // ── Header clicked handler (select entire column) ─────────────

  const handleHeaderClicked = useCallback(
    (colId: string) => {
      if (excludedColIds?.has(colId)) return;
      const api = gridRef.current?.api;
      if (!api) return;

      const lastRowIndex = api.getDisplayedRowCount() - 1;
      // Exclude the pinned bottom placeholder row
      let lastDataRow = lastRowIndex;
      for (let i = lastRowIndex; i >= 0; i--) {
        const node = api.getDisplayedRowAtIndex(i);
        if (node && node.rowPinned !== 'bottom') {
          lastDataRow = i;
          break;
        }
      }
      if (lastDataRow < 0) return;

      const newRange: CellRange = {
        anchor: { rowIndex: 0, colId },
        end: { rowIndex: lastDataRow, colId },
      };
      anchorRef.current = { rowIndex: 0, colId };
      setRange(newRange);
      gridRef.current?.api?.deselectAll();
    },
    [gridRef, excludedColIds, setRange],
  );

  // ── Shift+Arrow key handler (called inside onCellKeyDown) ─────

  const handleRangeKeyDown = useCallback(
    (event: { event?: Event | null }) => {
      const kbEvent = event.event as KeyboardEvent | undefined;
      if (!kbEvent) return;

      if (!kbEvent.shiftKey) {
        // Non-shift arrow key → update anchor to current focus, clear range
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(kbEvent.key)) {
          requestAnimationFrame(() => {
            const api = gridRef.current?.api;
            if (!api) return;
            const focused = api.getFocusedCell();
            if (focused && focused.rowPinned == null) {
              anchorRef.current = { rowIndex: focused.rowIndex, colId: focused.column.getColId() };
            }
          });
          clearRange();
        }
        return;
      }

      // Shift+Arrow → extend range
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(kbEvent.key)) return;

      // Use requestAnimationFrame so AG Grid processes the arrow key first
      requestAnimationFrame(() => {
        const api = gridRef.current?.api;
        if (!api) return;
        const focused = api.getFocusedCell();
        if (!focused || focused.rowPinned != null) return;

        const focusCoord: CellCoord = {
          rowIndex: focused.rowIndex,
          colId: focused.column.getColId(),
        };

        if (excludedColIds?.has(focusCoord.colId)) return;

        // If no anchor yet, use the cell that was focused before the arrow
        if (!anchorRef.current) {
          anchorRef.current = focusCoord;
        }

        const newRange: CellRange = {
          anchor: anchorRef.current,
          end: focusCoord,
        };
        setRange(newRange);
        gridRef.current?.api?.deselectAll();
      });
    },
    [gridRef, excludedColIds, setRange, clearRange],
  );

  // ── Clipboard copy ────────────────────────────────────────────

  const copyRangeToClipboard = useCallback(
    (api: NonNullable<AgGridReact['api']>, range: CellRange) => {
      const map = colIndexMapRef.current;
      const anchorCol = map.get(range.anchor.colId);
      const endCol = map.get(range.end.colId);
      if (anchorCol == null || endCol == null) return;

      const minRow = Math.min(range.anchor.rowIndex, range.end.rowIndex);
      const maxRow = Math.max(range.anchor.rowIndex, range.end.rowIndex);
      const minCol = Math.min(anchorCol, endCol);
      const maxCol = Math.max(anchorCol, endCol);

      // Get columns in display order within range
      const allCols = api.getAllDisplayedColumns();
      const rangeCols = allCols.filter((col) => {
        const idx = map.get(col.getColId());
        return idx != null && idx >= minCol && idx <= maxCol;
      });

      const lines: string[] = [];
      const flashCells: { rowNodes: unknown[]; columns: string[] } = {
        rowNodes: [],
        columns: rangeCols.map((c) => c.getColId()),
      };

      for (let r = minRow; r <= maxRow; r++) {
        const rowNode = api.getDisplayedRowAtIndex(r);
        if (!rowNode || rowNode.rowPinned === 'bottom') continue;
        flashCells.rowNodes.push(rowNode);

        const cells: string[] = [];
        for (const col of rangeCols) {
          const value = api.getCellValue({ rowNode, colKey: col, useFormatter: true });
          cells.push(value != null ? String(value) : '');
        }
        lines.push(cells.join('\t'));
      }

      const tsv = lines.join('\n');
      navigator.clipboard.writeText(tsv).catch(() => {
        // Fallback: ignore clipboard errors silently
      });

      // Flash copied cells for visual feedback
      api.flashCells({
        rowNodes: flashCells.rowNodes as NonNullable<ReturnType<typeof api.getDisplayedRowAtIndex>>[],
        columns: flashCells.columns,
        flashDuration: 300,
        fadeDuration: 200,
      });
    },
    [],
  );

  // ── Global keydown handler (Ctrl+C / Escape) ─────────────────

  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      const api = gridRef.current?.api;
      if (!api) return false;
      const range = rangeRef.current;

      // Escape → clear range
      if (e.key === 'Escape' && range) {
        clearRange();
        return true;
      }

      // Ctrl/Cmd+C → copy range to clipboard
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'c' && range) {
        e.preventDefault();
        copyRangeToClipboard(api, range);
        return true;
      }

      return false;
    },
    [gridRef, clearRange, copyRangeToClipboard],
  );

  // ── Get cells in range (for bulk clear) ───────────────────────

  const getCellsInRange = useCallback((): Array<{ rowIndex: number; colId: string }> => {
    const range = rangeRef.current;
    if (!range) return [];
    const api = gridRef.current?.api;
    if (!api) return [];

    const map = colIndexMapRef.current;
    const anchorCol = map.get(range.anchor.colId);
    const endCol = map.get(range.end.colId);
    if (anchorCol == null || endCol == null) return [];

    const minRow = Math.min(range.anchor.rowIndex, range.end.rowIndex);
    const maxRow = Math.max(range.anchor.rowIndex, range.end.rowIndex);
    const minCol = Math.min(anchorCol, endCol);
    const maxCol = Math.max(anchorCol, endCol);

    const allCols = api.getAllDisplayedColumns();
    const rangeCols = allCols.filter((col) => {
      const idx = map.get(col.getColId());
      return idx != null && idx >= minCol && idx <= maxCol;
    });

    const cells: Array<{ rowIndex: number; colId: string }> = [];
    for (let r = minRow; r <= maxRow; r++) {
      const rowNode = api.getDisplayedRowAtIndex(r);
      if (!rowNode || rowNode.rowPinned === 'bottom') continue;
      for (const col of rangeCols) {
        cells.push({ rowIndex: r, colId: col.getColId() });
      }
    }
    return cells;
  }, [gridRef]);

  // ── Return ────────────────────────────────────────────────────

  return {
    // AG Grid context for cellClassRules
    rangeContext: {
      cellRangeRef: rangeRef,
      colIndexMapRef: colIndexMapRef,
    },
    // Handlers
    handleCellClicked,
    handleHeaderClicked,
    handleRangeKeyDown,
    handleGlobalKeyDown,
    clearRange,
    rebuildColIndexMap,
    // State
    rangeRef,
    rangeVersion,
    getSelectedCellCount,
    getCellsInRange,
  };
}
