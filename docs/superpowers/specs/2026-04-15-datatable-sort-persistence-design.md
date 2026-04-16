# DataTable sort persistence

**Status:** Proposed  
**Date:** 2026-04-15  
**Effort:** XS — single component change + callsite wiring, no backend work

---

## Problem

`DataTable` resets the active sort column and direction on every page reload or navigation. Users re-sort on every visit.

---

## Current state

`DataTable` manages sort via `internalSort` (`useState<SortState | null>(null)`). When `onSortChange` is not provided by the caller, sort is fully uncontrolled and ephemeral. The component already reads/writes localStorage for two other features using `storageKey`:

- `atlasmail_dt_hidden_<storageKey>` — column visibility
- `atlasmail_dt_widths_<storageKey>` — column widths

Sort persistence follows the exact same pattern.

---

## Design

### New prop

```ts
/** When set, persists the active sort to localStorage under the key
 *  `atlasmail_dt_sort_<persistSortKey>`. Has no effect when the caller
 *  provides a controlled `sort` + `onSortChange`. */
persistSortKey?: string;
```

Add to `DataTableProps<T>` in `data-table.tsx`.

### Initialisation

Replace the current sort initialiser:

```ts
// Before
const [internalSort, setInternalSort] = useState<SortState | null>(null);
```

```ts
// After
const sortStorageKey = persistSortKey ? `atlasmail_dt_sort_${persistSortKey}` : null;

const [internalSort, setInternalSort] = useState<SortState | null>(() => {
  if (!sortStorageKey || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(sortStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SortState;
    if (parsed && typeof parsed.column === 'string' && typeof parsed.direction === 'string') return parsed;
  } catch { /* ignore */ }
  return null;
});
```

### Write-through

Add a `useEffect` immediately after, mirroring the column-visibility pattern:

```ts
useEffect(() => {
  if (!sortStorageKey || typeof window === 'undefined') return;
  try {
    if (internalSort) {
      window.localStorage.setItem(sortStorageKey, JSON.stringify(internalSort));
    } else {
      window.localStorage.removeItem(sortStorageKey);
    }
  } catch { /* ignore */ }
}, [internalSort, sortStorageKey]);
```

No changes to `handleSort` — `setInternalSort` already drives it.

### Controlled sort passthrough

When the caller provides `sort` + `onSortChange` (controlled mode), `persistSortKey` is a no-op — `internalSort` is never read or written. This is safe: `sort = controlledSort !== undefined ? controlledSort : internalSort`.

---

## Callsite migration

Add `persistSortKey` to every user-facing list view. Use the pattern `atlas_sort_<appId>_<viewId>`.

| File | Prop to add |
|------|-------------|
| `apps/crm/components/leads-view.tsx` | `persistSortKey="crm_leads"` |
| `apps/crm/components/views/contacts-list-view.tsx` | `persistSortKey="crm_contacts"` |
| `apps/crm/components/views/companies-list-view.tsx` | `persistSortKey="crm_companies"` |
| `apps/crm/components/views/deals-list-view.tsx` | `persistSortKey="crm_deals"` |
| `apps/crm/components/views/activities-list-view.tsx` | `persistSortKey="crm_activities"` |
| `apps/invoices/components/invoices-list-view.tsx` | `persistSortKey="invoices_list"` |
| `apps/invoices/components/recurring-invoices-list.tsx` | `persistSortKey="invoices_recurring"` |
| `apps/work/components/projects-list-view.tsx` | `persistSortKey="projects_list"` |
| `apps/hr/components/views/employees-list-view.tsx` | `persistSortKey="hr_employees"` |
| `apps/sign/components/sign-list-view.tsx` | `persistSortKey="sign_list"` |
| `apps/drive/components/drive-data-table-list.tsx` | `persistSortKey="drive_list"` |

Skip `org-members.tsx` and `project-financials-tab.tsx` — these are secondary/admin views where sort persistence adds little value.

The storage key prefix intentionally uses `atlasmail_dt_sort_` (matching the other `atlasmail_dt_*` keys) for namespace consistency at the localStorage level, while the prop value uses a shorter human-readable `atlas_sort_*` alias. Note: `storageKey` is separate — callers may or may not pass it too (for column visibility). `persistSortKey` is independent.

---

## Edge cases

- **Invalid stored value** — caught by try/catch, falls back to `null` (no sort).
- **Column removed** — if stored `column` key no longer exists in `columns`, sorting falls back to unsorted (the `sortedData` memo finds no column and returns `filteredData` unchanged). No special handling needed.
- **Controlled callers** — `persistSortKey` is silently ignored. No behaviour change.
- **SSR** — guarded by `typeof window === 'undefined'` check.

---

## What is not in scope

- Server-side sort persistence (unnecessary; localStorage is the right store for per-device UI state).
- Pagination persistence (separate concern, separate key if ever needed).
- Any migration of existing stored values (no prior keys exist).
