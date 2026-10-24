import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** A fixed-width, right-aligned column on wide screens (a due date); on a phone it joins the second line. */
function ListAside({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'md:col-start-5 md:row-start-1 md:ml-3 md:w-28 md:text-right md:leading-5',
        className
      )}
      data-slot="list-aside"
      {...props}
    />
  );
}

export { ListAside };
