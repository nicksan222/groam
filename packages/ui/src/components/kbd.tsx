import type * as React from 'react';
import { cn } from '#src/lib/utils';

/** Keyboard key hint, e.g. the ⌘K shortcut beside a search trigger. */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded border border-border bg-muted/60 px-1 text-[10px] font-medium leading-none text-muted-foreground select-none [&_svg]:size-3',
        className
      )}
      data-slot="kbd"
      {...props}
    />
  );
}

export { Kbd };
