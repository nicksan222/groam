'use client';

import type * as React from 'react';
import { cn } from '#src/lib/utils';
import { useTimeline } from './timeline-context';
import { timelineBadgeVariants } from './timeline-variants';

export interface TimelineBadgeProps extends React.ComponentProps<'div'> {
  children?: React.ReactNode;
}

function TimelineBadge({ className, children, ref, ...props }: TimelineBadgeProps) {
  const { variant } = useTimeline();

  return (
    <div
      ref={ref}
      data-slot="timeline-badge"
      data-variant={variant}
      className={cn(timelineBadgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { TimelineBadge };
