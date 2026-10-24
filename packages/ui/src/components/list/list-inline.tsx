import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** Facts that show only in a phone's second line, such as a flag that wide screens put in `List.Meta`. */
function ListInline({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span className={cn('contents md:hidden', className)} data-slot="list-inline" {...props} />
  );
}

export { ListInline };
