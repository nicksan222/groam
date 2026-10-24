import type * as React from 'react';
import { cn } from '#src/lib/utils';
import { ListProvider } from './list-context';

/**
 * The frame of a list: optional `List.Toolbar`, then a `List.Body` of groups and rows, then an
 * optional `List.Footer`. `bleed` (default) lets the body and footer run edge to edge out of the
 * page padding. `fill` grows the list to the height of its pane (the pane must be a flex column),
 * so the footer rests at the bottom even when the list is short or empty.
 */
function ListRoot({
  bleed = true,
  className,
  fill = false,
  ...props
}: React.ComponentProps<'div'> & { bleed?: boolean; fill?: boolean }) {
  return (
    <ListProvider value={{ bleed, fill }}>
      <div
        className={cn('flex min-w-0 flex-col gap-3', fill && 'min-h-0 flex-1', className)}
        data-slot="list"
        {...props}
      />
    </ListProvider>
  );
}

export { ListRoot };
