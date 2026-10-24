import type * as React from 'react';
import { cn } from '#src/lib/utils';

/**
 * The first column, wide screens only: a selection `List.Checkbox`. Render it with no children on
 * rows that cannot be selected, so every row's text lines up.
 */
function ListLeading({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'mr-3 flex h-5 w-5 items-center max-md:hidden md:col-start-1 md:row-start-1',
        className
      )}
      data-slot="list-leading"
      {...props}
    />
  );
}

export { ListLeading };
