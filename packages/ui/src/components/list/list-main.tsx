import type * as React from 'react';
import { cn } from '#src/lib/utils';

/**
 * The text block: `List.Title`, `List.Inline`, `List.Aside`, `List.Description`. On a phone it
 * wraps as the title line over a second line of facts; on wide screens its parts join the row's
 * columns.
 */
function ListMain({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 max-md:col-start-2 md:contents',
        className
      )}
      data-slot="list-main"
      {...props}
    />
  );
}

export { ListMain };
