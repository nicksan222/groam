'use client';

import { cn } from '@groam/ui/lib/utils';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import type * as React from 'react';

export function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      className={cn('aspect-square size-full object-cover', className)}
      crossOrigin="anonymous"
      data-slot="avatar-image"
      {...props}
    />
  );
}
