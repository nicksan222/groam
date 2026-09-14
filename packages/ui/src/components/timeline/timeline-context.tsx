'use client';

import { createContext, type ReactNode, use } from 'react';
import type { TimelineVariant } from './timeline-variant';

export type { TimelineVariant };

export type TimelineContextValue = {
  variant: TimelineVariant;
};

const timelineContextByVariant: Record<TimelineVariant, TimelineContextValue> = {
  default: { variant: 'default' },
  minimal: { variant: 'minimal' },
  activity: { variant: 'activity' },
  route: { variant: 'route' }
};

const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

function timelineContextValue(variant: TimelineVariant): TimelineContextValue {
  return timelineContextByVariant[variant] ?? timelineContextByVariant.default;
}

export function TimelineProvider({
  children,
  variant
}: {
  children: ReactNode;
  variant: TimelineVariant;
}) {
  return (
    <TimelineContext.Provider value={timelineContextValue(variant)}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline(): TimelineContextValue {
  return use(TimelineContext) ?? timelineContextByVariant.default;
}
