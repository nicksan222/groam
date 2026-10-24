'use client';

import { cn } from '@groam/ui/lib/utils';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import type * as React from 'react';

export function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      data-slot="avatar"
      {...props}
    />
  );
}
