import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

export type MutedCopyProps = React.ComponentProps<'p'>;

function MutedCopy({ className, ...props }: MutedCopyProps) {
  return (
    <p
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      data-slot="muted-copy"
      {...props}
    />
  );
}

export { MutedCopy };
