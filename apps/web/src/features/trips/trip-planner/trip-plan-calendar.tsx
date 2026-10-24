import { PlanCalendar } from '@groam/ui/components/plan-calendar';
import { addIsoDays, type PlanCalendarSlot } from '@groam/ui/lib/plan-calendar';
import { SHELL_PANE_BOTTOM_NAV } from '@groam/ui/lib/shell-layout';
import { cn, motionSafeScrollBehavior } from '@groam/ui/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { tripDayJumpEvent } from '@/features/trips/trip-destinations/trip-jump-targets';
import type { PlannerCalendar } from '@/types/trip-planner';

/** The trip day a route stop or `?day=N` link asked for, as a calendar date. */
function useJumpedDate(startDate: string, initialDate?: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [date, setDate] = useState(initialDate);
  useEffect(() => {
    const onJump = (event: Event) => {
      const day = (event as CustomEvent<number>).detail;
      setDate(addIsoDays(startDate, day - 1));
      ref.current?.scrollIntoView({ behavior: motionSafeScrollBehavior(), block: 'start' });
    };
    window.addEventListener(tripDayJumpEvent, onJump);
    return () => window.removeEventListener(tripDayJumpEvent, onJump);
  }, [startDate]);
  return { date, ref };
}

/** The trip at a glance on the Kloq calendar: open a plan to read its notes, or plan in empty time. */
export function TripPlanCalendar({
  calendar,
  fill = false,
  initialDate,
  onCreate
}: {
  calendar: PlannerCalendar;
  /** Takes the room it is given and scrolls inside itself; otherwise a framed block of fixed height. */
  fill?: boolean;
  /** The day (`YYYY-MM-DD`) the calendar opens on; the trip's first day by default. */
  initialDate?: string;
  /** Empty time was clicked or dragged across; without it nothing new is planned here. */
  onCreate?: (slot: PlanCalendarSlot) => void;
}) {
  const jumped = useJumpedDate(calendar.startDate, initialDate);
  return (
    <div
      className={cn('scroll-mt-4', fill && ['flex min-h-0 flex-1 flex-col', SHELL_PANE_BOTTOM_NAV])}
      ref={jumped.ref}
    >
      <PlanCalendar
        className={fill ? 'h-auto min-h-[24rem] flex-1 rounded-none border-0' : undefined}
        endDate={calendar.endDate}
        events={calendar.events}
        focusDate={jumped.date}
        onCreate={onCreate}
        startDate={calendar.startDate}
        undated={calendar.undated}
      />
    </div>
  );
}
