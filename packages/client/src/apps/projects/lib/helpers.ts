export function getProjectStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'var(--color-success)';
    case 'paused': return 'var(--color-warning)';
    case 'completed': return 'var(--color-accent-primary)';
    case 'archived': return 'var(--color-text-tertiary)';
    default: return 'var(--color-text-tertiary)';
  }
}
