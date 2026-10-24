import type * as React from 'react';
import { cn } from '#src/lib/utils';

/**
 * Controls at the right edge that stay on every screen size: a Switch, Revoke, or Pay button, a
 * role select. They sit above the title's row-wide hit area. Unlike `List.Meta` they never hide on
 * a phone. Use it instead of `List.Avatar` and
 * `List.Age` on rows that carry actions.
 */
function ListActions({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'relative z-10 ml-3 flex max-md:min-h-11 min-w-0 items-center justify-end gap-2 justify-self-end max-md:col-start-3 max-md:row-start-1 md:col-span-2 md:col-start-6 md:row-start-1',
        className
      )}
      data-slot="list-actions"
      {...props}
    />
  );
}

export { ListActions };
