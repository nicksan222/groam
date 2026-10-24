import { cn } from '@groam/ui/lib/utils';
import type * as React from 'react';

const sizeClass = {
  default: 'min-h-40 rounded-xl p-6 text-center text-sm',
  inline: 'flex items-center gap-2 rounded-xl px-3 py-2 text-xs'
} as const;

export type ErrorWellProps = React.ComponentProps<'div'> & {
  /** `default` fills a pane; `inline` is a compact row under a message. */
  size?: keyof typeof sizeClass;
};

function ErrorWell({ className, size = 'default', ...props }: ErrorWellProps) {
  return (
    <div
      className={cn(
        'border border-destructive/20 bg-destructive/5 text-destructive',
        sizeClass[size],
        className
      )}
      data-slot="error-well"
      role="alert"
      {...props}
    />
  );
}

export { ErrorWell };
