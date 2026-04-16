import { type ReactNode } from 'react';
import { Button } from '../ui/button';

export interface QuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-lg)',
        flexWrap: 'wrap',
      }}
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="secondary"
          size="sm"
          icon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
