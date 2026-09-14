'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from '@groam/ui/lib/utils';
import { isValidElement } from 'react';

// Base UI exposes the shared delay in ms; Radix called it `delayDuration`. Map
// the old name so existing call sites keep working unchanged.
function TooltipProvider({
  delayDuration = 0,
  delay,
  ...props
}: TooltipPrimitive.Provider.Props & { delayDuration?: number }) {
  return <TooltipPrimitive.Provider delay={delay ?? delayDuration} {...props} />;
}

// Base UI moved `delay` onto the Provider, so wrap each Root in a Provider to
// preserve the repo's instant-by-default tooltips (delayDuration={0}).
function Tooltip({
  delayDuration = 0,
  ...props
}: TooltipPrimitive.Root.Props & { delayDuration?: number }) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

// Radix used `asChild` to merge the trigger into its child; Base UI uses the
// `render` prop. Translate so existing `<TooltipTrigger asChild>` keeps working.
function TooltipTrigger({
  asChild,
  children,
  ...props
}: TooltipPrimitive.Trigger.Props & { asChild?: boolean }) {
  if (asChild && isValidElement(children)) {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" render={children} {...props} />;
  }
  return (
    <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
}

function TooltipContent({
  className,
  align = 'center',
  sideOffset = 4,
  side = 'top',
  anchor,
  children,
  portalProps,
  ...props
}: TooltipPrimitive.Popup.Props & {
  align?: TooltipPrimitive.Positioner.Props['align'];
  side?: TooltipPrimitive.Positioner.Props['side'];
  sideOffset?: TooltipPrimitive.Positioner.Props['sideOffset'];
  anchor?: TooltipPrimitive.Positioner.Props['anchor'];
  portalProps?: TooltipPrimitive.Portal.Props;
}) {
  return (
    <TooltipPrimitive.Portal {...portalProps}>
      <TooltipPrimitive.Positioner
        align={align}
        anchor={anchor}
        className="z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width)"
        data-slot="tooltip-positioner"
        side={side}
        sideOffset={sideOffset}
      >
        <TooltipPrimitive.Popup
          className={cn(
            'relative flex h-(--popup-height,auto) w-(--popup-width,auto) origin-(--transform-origin) text-balance rounded-md border bg-popover not-dark:bg-clip-padding text-popover-foreground text-xs shadow-md/5 transition-[width,height,opacity] before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-instant:duration-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]',
            className
          )}
          data-slot="tooltip-popup"
          {...props}
        >
          <TooltipPrimitive.Viewport
            className="relative size-full overflow-clip px-(--viewport-inline-padding) py-1 [--viewport-inline-padding:--spacing(2)] data-instant:transition-none **:data-current:data-ending-style:opacity-0 **:data-current:data-starting-style:opacity-0 **:data-previous:data-ending-style:opacity-0 **:data-previous:data-starting-style:opacity-0 **:data-current:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding)-2px)] **:data-previous:w-[calc(var(--popup-width)-2*var(--viewport-inline-padding)-2px)] **:data-previous:truncate **:data-current:opacity-100 **:data-previous:opacity-100 **:data-current:transition-opacity **:data-previous:transition-opacity"
            data-slot="tooltip-viewport"
          >
            {children}
          </TooltipPrimitive.Viewport>
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipContent as TooltipPopup, TooltipProvider, TooltipTrigger };
