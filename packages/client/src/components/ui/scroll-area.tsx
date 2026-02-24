import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import type { ReactNode } from 'react';

interface ScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function ScrollArea({ children, className }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root className={`scroll-area-root ${className || ''}`} style={{ overflow: 'hidden', height: '100%' }}>
      <ScrollAreaPrimitive.Viewport style={{ width: '100%', height: '100%' }}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar className="scroll-area-scrollbar" orientation="vertical">
        <ScrollAreaPrimitive.Thumb className="scroll-area-thumb" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
}
