import { useState } from 'react';
import { ChevronDown, Inbox } from 'lucide-react';

export function CollapsibleSection({
  label,
  icon: Icon,
  color,
  count,
  defaultOpen = true,
  children,
}: {
  label: string;
  icon: typeof Inbox;
  color: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="task-collapsible-section">
      <button
        className="task-section-header task-section-header-collapsible"
        style={{ color }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <ChevronDown size={13} className={`task-section-chevron${isOpen ? '' : ' collapsed'}`} />
        <Icon size={13} />
        <span>{label}</span>
        <span className="task-section-count">{count}</span>
      </button>
      {isOpen && children}
    </div>
  );
}
