'use client';

import type * as React from 'react';
import { cn } from '#src/lib/utils';
import { TimelineProvider, type TimelineVariant } from './timeline-context';
import { timelineRootVariants } from './timeline-variants';

export interface TimelineProps extends React.ComponentProps<'div'> {
  /** Trim first/last item padding so the rail can meet section edges (best with default variant). */
  clipSidebar?: boolean;
  /** Visual density. `minimal` is a segmented hairline with 20px markers; `activity` is a segmented hairline with 24px actor avatars; `route` is a 128×160 photo marker. */
  variant?: TimelineVariant;
}

function Timeline({ clipSidebar, className, ref, variant = 'default', ...props }: TimelineProps) {
  return (
    <TimelineProvider variant={variant}>
      <div
        ref={ref}
        data-slot="timeline"
        data-clip-sidebar={clipSidebar ? '' : undefined}
        data-variant={variant}
        className={cn(
          timelineRootVariants({ clipSidebar: clipSidebar ?? false, variant }),
          className
        )}
        {...props}
      />
    </TimelineProvider>
  );
}

export { Timeline };
