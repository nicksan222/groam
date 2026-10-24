'use client';

import { Toolbar as ToolbarPrimitive } from '@base-ui/react/toolbar';
import { cn } from '@groam/ui/lib/utils';
import type React from 'react';

export function Toolbar({ className, ...props }: ToolbarPrimitive.Root.Props): React.ReactElement {
  return (
    <ToolbarPrimitive.Root
      className={cn(
        'relative flex gap-2 rounded-xl border bg-card not-dark:bg-clip-padding p-1 text-card-foreground',
        className
      )}
      data-slot="toolbar"
      {...props}
    />
  );
}

export function ToolbarButton({
  className,
  ...props
}: ToolbarPrimitive.Button.Props): React.ReactElement {
  return (
    <ToolbarPrimitive.Button className={cn(className)} data-slot="toolbar-button" {...props} />
  );
}
