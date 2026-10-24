import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** Right-hand facts that fit only on wide screens: flags, chips, counts. */
function ListMeta({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'ml-3 flex h-5 min-w-0 items-center justify-end gap-2 max-md:hidden md:col-start-4 md:row-start-1',
        className
      )}
      data-slot="list-meta"
      {...props}
    />
  );
}

export { ListMeta };
