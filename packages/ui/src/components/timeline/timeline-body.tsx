'use client';

import type * as React from 'react';
import { cn } from '#src/lib/utils';
import { useTimeline } from './timeline-context';
import { timelineBodyVariants } from './timeline-variants';

export interface TimelineBodyProps extends React.ComponentProps<'div'> {}

function TimelineBody({ className, ref, ...props }: TimelineBodyProps) {
  const { variant } = useTimeline();

  return (
    <div
      ref={ref}
      data-slot="timeline-body"
      data-variant={variant}
      className={cn(timelineBodyVariants({ variant }), className)}
      {...props}
    />
  );
}

export { TimelineBody };
