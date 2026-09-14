import { ScrollArea } from '@groam/ui/components/scroll-area';
import { cn } from '@groam/ui/lib/utils';
import type React from 'react';
import type { TabItemProps } from '#src/components/shell/types';

export const SidebarDesktopAside: React.FC<{
  tabs: React.ReactElement<TabItemProps>[];
  header?: React.ReactNode;
  width: number;
  className?: string;
  'data-testid'?: string;
}> = ({ tabs, header, width, className, 'data-testid': dataTestId }) => (
  <aside
    className={cn(
      'hidden min-w-0 max-w-full overflow-hidden border-r md:flex md:h-full md:shrink-0 md:flex-col',
      className
    )}
    style={{ width }}
    data-testid={dataTestId}
  >
    <ScrollArea className="min-w-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:min-w-0 [&_[data-slot=scroll-area-viewport]>div]:max-w-full">
      {header && (
        <div className="min-w-0 max-w-full overflow-hidden">
          {header}
          <div className="mx-4 border-t" />
        </div>
      )}
      <nav className="flex min-w-0 max-w-full flex-col gap-0.5 overflow-hidden p-3">{tabs}</nav>
    </ScrollArea>
  </aside>
);
