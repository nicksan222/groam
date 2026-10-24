import type * as React from 'react';
import { cn } from '#src/lib/utils';
import { useListContext } from './list-context';

/**
 * A bar pinned to the bottom of the pane (sticky, and at the bottom of a short list when the list
 * `fill`s). Edge to edge when the list bleeds; it also cancels the page's bottom padding
 * (`--shell-page-bottom`, 32px outside a page) so it meets the pane's edge. `desktopOnly` hides it on phones, for
 * keyboard hints. `clearDock` leaves room for the phone's floating action buttons.
 */
function ListFooter({
  className,
  clearDock = false,
  desktopOnly = false,
  ...props
}: React.ComponentProps<'footer'> & { clearDock?: boolean; desktopOnly?: boolean }) {
  const { bleed } = useListContext();
  return (
    <footer
      className={cn(
        'sticky bottom-0 z-10 mt-auto min-h-14 shrink-0 items-center gap-4 pb-[env(safe-area-inset-bottom,0px)] md:min-h-10 md:pb-0 border-t border-border bg-background px-4 text-xs text-muted-foreground md:px-6',
        desktopOnly ? 'hidden md:flex' : 'flex',
        clearDock && 'max-md:pr-16',
        bleed && '-mx-4 -mb-[var(--shell-page-bottom,2rem)] md:-mx-6',
        className
      )}
      data-slot="list-footer"
      {...props}
    />
  );
}

export { ListFooter };
