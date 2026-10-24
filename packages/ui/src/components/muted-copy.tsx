import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

const sizeClass = {
  sm: 'text-sm leading-relaxed',
  xs: 'text-xs leading-5'
} as const;

export type MutedCopyProps = React.ComponentProps<'p'> & {
  size?: keyof typeof sizeClass;
};

function MutedCopy({ className, size = 'sm', ...props }: MutedCopyProps) {
  return (
    <p
      className={cn('text-muted-foreground', sizeClass[size], className)}
      data-slot="muted-copy"
      {...props}
    />
  );
}

export { MutedCopy };
