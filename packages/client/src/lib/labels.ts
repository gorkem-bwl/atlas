export interface Label {
  id: string;
  name: string;
  color: string; // CSS color value
}

export const DEFAULT_LABELS: Label[] = [
  { id: 'urgent', name: 'Urgent', color: '#dc2626' },
  { id: 'follow-up', name: 'Follow up', color: '#d97706' },
  { id: 'waiting', name: 'Waiting', color: '#7c3aed' },
  { id: 'personal', name: 'Personal', color: '#059669' },
  { id: 'work', name: 'Work', color: '#2563eb' },
  { id: 'finance', name: 'Finance', color: '#0891b2' },
];

/** Look up a label definition by its ID. Returns undefined if not found. */
export function getLabelById(id: string): Label | undefined {
  return DEFAULT_LABELS.find((l) => l.id === id);
}
