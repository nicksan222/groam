import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** The last column, wide screens only: a short fact such as the age. Pass a `<time>`. */
function ListAge({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'ml-3 w-10 text-right text-xs leading-5 text-muted-foreground/70 max-md:hidden md:col-start-7 md:row-start-1',
        className
      )}
      data-slot="list-age"
      {...props}
    />
  );
}

export { ListAge };
