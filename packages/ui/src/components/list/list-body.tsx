import type * as React from 'react';
import { cn } from '#src/lib/utils';
import { useListContext } from './list-context';

/**
 * The list's content: a hairline on top, then groups and rows (or `List.Empty`).
 * It runs edge to edge when the list bleeds, and takes the leftover height when the list fills.
 */
function ListBody({ className, ...props }: React.ComponentProps<'div'>) {
  const { bleed, fill } = useListContext();
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col border-t border-border',
        bleed && '-mx-4 md:-mx-6',
        fill && 'flex-1',
        className
      )}
      data-slot="list-body"
      {...props}
    />
  );
}

export { ListBody };
