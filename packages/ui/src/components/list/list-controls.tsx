import type { ComponentProps } from 'react';
import { cn } from '#src/lib/utils';

/** Right-aligned footer controls; compose SearchTrigger, Sort, and domain-specific actions. */
export function ListControls({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-label="List controls"
      className={cn('ml-auto flex min-w-0 flex-wrap items-center gap-2', className)}
      data-slot="list-controls"
      role="group"
      {...props}
    />
  );
}
