'use client';

import { ChevronDown } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import type * as React from 'react';

function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

/**
 * The trigger: pass the label as children and it shows a chevron that turns when the content is
 * open, so a disclosure always looks like one. Use `asChild` to bring your own control (a
 * `Button`), which then owns its own cue.
 */
function CollapsibleTrigger({
  asChild,
  children,
  className,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      asChild={asChild}
      className={cn(
        !asChild &&
          'group inline-flex cursor-pointer items-center gap-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
      data-slot="collapsible-trigger"
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {children}
          <ChevronDown
            aria-hidden
            className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </>
      )}
    </CollapsiblePrimitive.CollapsibleTrigger>
  );
}

/**
 * `keepMounted` leaves the content in the DOM while collapsed, hidden with CSS, like a native
 * `<details>`: fields keep their values and a test can still read them. Default content unmounts.
 */
function CollapsibleContent({
  className,
  keepMounted = false,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>, 'forceMount'> & {
  keepMounted?: boolean;
}) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      className={cn(keepMounted && 'data-[state=closed]:hidden', className)}
      data-slot="collapsible-content"
      forceMount={keepMounted ? true : undefined}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
