import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** One muted line under the title on a phone, up to two on wide screens. */
function ListDescription({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'line-clamp-1 min-w-0 flex-1 text-muted-foreground max-md:text-xs md:col-start-3 md:row-start-2 md:line-clamp-2 md:text-[13px] md:leading-[18px]',
        className
      )}
      data-slot="list-description"
      {...props}
    />
  );
}

export { ListDescription };
