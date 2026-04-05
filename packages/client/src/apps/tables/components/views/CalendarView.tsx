import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TableColumn, TableRow, TableViewConfig } from '@atlasmail/shared';
import { IconButton } from '../../../../components/ui/icon-button';
import { Button } from '../../../../components/ui/button';
import { Select } from '../../../../components/ui/select';

export function CalendarView({
  columns,
  rows,
  viewConfig,
  onViewConfigUpdate,
  triggerAutoSave,
  onExpandRow,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  viewConfig: TableViewConfig;
  onViewConfigUpdate: (updated: TableViewConfig) => void;
  triggerAutoSave: (updates: { viewConfig?: TableViewConfig }) => void;
  onExpandRow: (rowId: string) => void;
}) {
  const { t } = useTranslation();
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const effectiveCalendarDateCol = useMemo(() => {
    if (viewConfig.calendarDateColumnId) {
      return columns.find((c) => c.id === viewConfig.calendarDateColumnId) || null;
    }
    return columns.find((c) => c.type === 'date') || null;
  }, [columns, viewConfig.calendarDateColumnId]);

  const calendarDateMap = useMemo(() => {
    const map: Record<string, TableRow[]> = {};
    if (!effectiveCalendarDateCol) return map;
    for (const row of rows) {
      const val = row[effectiveCalendarDateCol.id];
      if (!val) continue;
      const dateStr = String(val);
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(row);
    }
    return map;
  }, [rows, effectiveCalendarDateCol]);

  return (
    <div className="tables-calendar-view">
      {!effectiveCalendarDateCol ? (
        <div className="tables-kanban-no-group">
          <Calendar size={36} style={{ opacity: 0.3 }} />
          <div>{t('tables.noDateColumn')}</div>
        </div>
      ) : (
        <>
          {/* Date column selector */}
          {columns.filter((c) => c.type === 'date').length > 1 && (
            <div className="tables-calendar-date-selector">
              <span>{t('tables.calendarDateColumn')}:</span>
              <Select
                value={effectiveCalendarDateCol.id}
                onChange={(v) => {
                  const updated = { ...viewConfig, calendarDateColumnId: v };
                  onViewConfigUpdate(updated);
                  triggerAutoSave({ viewConfig: updated });
                }}
                options={columns.filter((c) => c.type === 'date').map((c) => ({ value: c.id, label: c.name }))}
                size="sm"
                width={140}
              />
            </div>
          )}
          {/* Month navigation */}
          <div className="tables-calendar-header">
            <IconButton
              icon={<ChevronLeft size={16} />}
              label="Previous month"
              onClick={() => setCalendarMonth((prev) => {
                const d = new Date(prev.year, prev.month - 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              size={28}
            />
            <span className="tables-calendar-month-label">
              {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <IconButton
              icon={<ChevronRight size={16} />}
              label="Next month"
              onClick={() => setCalendarMonth((prev) => {
                const d = new Date(prev.year, prev.month + 1, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
              })}
              size={28}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                setCalendarMonth({ year: now.getFullYear(), month: now.getMonth() });
              }}
              style={{ marginLeft: 8 }}
            >
              {t('tables.today')}
            </Button>
          </div>
          {/* Weekday header */}
          <div className="tables-calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="tables-calendar-weekday">{d}</div>
            ))}
            {/* Day cells */}
            {(() => {
              const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1);
              const startOffset = firstDay.getDay();
              const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
              const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
              const today = new Date();
              const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < totalCells; i++) {
                const dayNum = i - startOffset + 1;
                const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
                const dateKey = isCurrentMonth
                  ? `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                  : '';
                const dayRows = isCurrentMonth ? (calendarDateMap[dateKey] || []) : [];
                const isToday = dateKey === todayKey;
                cells.push(
                  <div
                    key={i}
                    className={`tables-calendar-cell${isCurrentMonth ? '' : ' outside'}${isToday ? ' today' : ''}`}
                  >
                    {isCurrentMonth && (
                      <>
                        <span className={`tables-calendar-day-number${isToday ? ' today' : ''}`}>{dayNum}</span>
                        <div className="tables-calendar-cell-pills">
                          {dayRows.slice(0, 3).map((row) => {
                            const titleCol = columns.find((c) => c.type === 'text');
                            const title = titleCol ? String(row[titleCol.id] || '') : row._id.slice(0, 8);
                            return (
                              <button
                                key={row._id}
                                className="tables-calendar-pill"
                                onClick={() => onExpandRow(row._id)}
                                title={title}
                              >
                                {title || 'Untitled'}
                              </button>
                            );
                          })}
                          {dayRows.length > 3 && (
                            <span className="tables-calendar-more">+{dayRows.length - 3}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>,
                );
              }
              return cells;
            })()}
          </div>
        </>
      )}
    </div>
  );
}
