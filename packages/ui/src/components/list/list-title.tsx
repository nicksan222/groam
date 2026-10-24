import { Slot } from '@radix-ui/react-slot';
import type * as React from 'react';
import { cn } from '#src/lib/utils';

/**
 * The title. Wrap a link or button with `asChild`: it stretches over the whole row, so a click
 * anywhere opens it. The row's cursor styling is the focus indicator, so no ring while the row
 * holds the cursor; focus that is not the cursor (tabbing in) still gets one. `muted` is for
 * settled items.
 */
function ListTitle({
  asChild = false,
  className,
  muted = false,
  ...props
}: React.ComponentProps<'span'> & { asChild?: boolean; muted?: boolean }) {
  const Component = asChild ? Slot : 'span';
  return (
    <Component
      className={cn(
        'line-clamp-2 min-w-0 text-left leading-5 underline-offset-4 outline-none after:absolute after:inset-0 hover:underline focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-ring group-data-[cursor]/row:focus-visible:after:ring-0 max-md:basis-full max-md:text-[14.5px] md:col-start-3 md:row-start-1',
        muted ? 'font-normal text-muted-foreground' : 'font-medium text-foreground',
        className
      )}
      data-slot="list-title"
      {...props}
    />
  );
}

export { ListTitle };
