import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** An area under the row that opens in place; it lines up with the text column. */
function ListExpanded({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'min-w-0 max-md:col-span-2 max-md:col-start-2 md:col-start-3 md:col-end-[-1] md:row-start-3',
        className
      )}
      data-slot="list-expanded"
      {...props}
    />
  );
}

export { ListExpanded };
