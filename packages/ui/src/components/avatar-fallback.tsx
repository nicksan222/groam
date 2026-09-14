'use client';

import { cn } from '@groam/ui/lib/utils';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import type * as React from 'react';

export function AvatarFallback({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      className={cn('flex size-full items-center justify-center rounded-full bg-muted', className)}
      data-slot="avatar-fallback"
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
  );
}
