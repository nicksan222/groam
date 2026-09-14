'use client';

import type * as React from 'react';
import { cn } from '#src/lib/utils';

export interface TimelineBreakProps extends React.ComponentProps<'div'> {}

function TimelineBreak({ className, ref, ...props }: TimelineBreakProps) {
  return (
    <div
      ref={ref}
      data-slot="timeline-break"
      className={cn(
        'relative z-[1] border-0 border-t-2 border-dashed border-border/60 bg-background',
        'my-1 h-4',
        className
      )}
      {...props}
    />
  );
}

export { TimelineBreak };
