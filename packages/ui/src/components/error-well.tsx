import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

export type ErrorWellProps = React.ComponentProps<'div'>;

function ErrorWell({ className, ...props }: ErrorWellProps) {
  return (
    <div
      className={cn(
        'min-h-40 rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center text-sm text-destructive',
        className
      )}
      data-slot="error-well"
      role="alert"
      {...props}
    />
  );
}

export { ErrorWell };
