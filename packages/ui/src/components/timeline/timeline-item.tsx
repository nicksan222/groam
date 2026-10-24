'use client';

import type * as React from 'react';
import { cn } from '#src/lib/utils';
import { useTimeline } from './timeline-context';
import { isMinimalTimelineVariant } from './timeline-variant';
import { timelineItemVariants } from './timeline-variants';

export interface TimelineItemProps extends React.ComponentProps<'div'> {
  condensed?: boolean;
}

function TimelineItem({ condensed, className, ref, ...props }: TimelineItemProps) {
  const { variant } = useTimeline();
  const isCondensed = condensed === true || isMinimalTimelineVariant(variant);

  return (
    <div
      ref={ref}
      data-slot="timeline-item"
      data-condensed={isCondensed ? '' : undefined}
      data-variant={variant}
      className={cn(
        timelineItemVariants({
          variant,
          condensed: condensed === true && !isMinimalTimelineVariant(variant)
        }),
        className
      )}
      {...props}
    />
  );
}

export { TimelineItem };
