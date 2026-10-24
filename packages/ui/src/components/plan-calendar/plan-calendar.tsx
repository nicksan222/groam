'use client';

import { type SyntheticEvent, useEffect, useMemo } from 'react';
import {
  type PlanCalendarContextValue,
  PlanCalendarProvider
} from '#src/components/plan-calendar/plan-calendar-context';
import { dateFromString } from '#src/lib/calendar-date';
import {
  isoDaySpan,
  kloqView,
  type PlanCalendarEvent,
  type PlanCalendarSlot,
  clickedPlanSlot,
  planCalendarEvents,
  planCalendarSlot
} from '#src/lib/plan-calendar';
import { cn } from '#src/lib/utils';
import type { CalEvent } from '#src/vendor/kloq/lib/calendar-types';
import { overrideFullDate } from '#src/vendor/kloq/lib/event-text';
import { parseInstant } from '#src/vendor/kloq/lib/instant';
import { PlanCalendarDayHeader } from '#tsx/components/plan-calendar/plan-calendar-day-header';
import { PlanCalendarFocus } from '#tsx/components/plan-calendar/plan-calendar-focus';
import { PlanCalendarToolbar } from '#tsx/components/plan-calendar/plan-calendar-toolbar';
import { CalendarApp as Kloq } from '#tsx/vendor/kloq/calendar/calendar-app';

export type PlanCalendarProps = {
  events: readonly PlanCalendarEvent[];
  /** First and last day of the trip, `YYYY-MM-DD`; days outside are hatched. */
  startDate: string;
  endDate: string;
  /** The trip has no real dates yet: `startDate` only anchors the grid and days read "Day N". */
  undated?: boolean;
  /** A day (`YYYY-MM-DD`) to bring into view; changing it moves the calendar there. */
  focusDate?: string;
  /**
   * Clicking or dragging across empty time picks a slot to plan in. Without it the calendar is an
   * overview: nothing on it starts a plan.
   */
  onCreate?: (slot: PlanCalendarSlot) => void;
  className?: string;
};

const slots = { DayHeader: PlanCalendarDayHeader };
// An overview: nothing on it starts, moves or deletes a plan.
const keymap = { create: null } as const;
const readOnly = { canDrop: () => false };

/**
 * The slot of an event Kloq drafted from a drag: one the host has not passed in. A drafted event
 * has no title yet; a copy (duplicate, paste) keeps its plan's title and is not a new plan.
 */
function draftedSlot(next: CalEvent[], known: CalEvent[]): PlanCalendarSlot | null {
  const ids = new Set(known.map((event) => event.id));
  const added = next.filter((event) => !ids.has(event.id));
  const draft = added.length === 1 && added[0]?.title === '' ? added[0] : undefined;
  if (!draft) return null;
  const start = new Date(parseInstant(draft.start));
  const end = new Date(parseInstant(draft.end));
  return planCalendarSlot(start, end, Boolean(draft.allDay));
}

/** Empty-slot presses never start an event. */
function blockCreation(event: SyntheticEvent) {
  const target = event.target as HTMLElement;
  if (target.closest('[data-cal-event], [data-cal-more]')) return;
  if (target.closest('[data-cal-canvas], [data-cal-lane]')) event.stopPropagation();
}

/**
 * A trip at a glance on the Kloq calendar (vendored in `src/vendor/kloq`): plans on a time
 * grid, stays and places as spans, trip days in the column heads, and Kloq's own views,
 * navigation and read-only event panel. Plans open read-only; with `onCreate`, empty time
 * can be clicked or dragged across to plan something new there.
 */
export function PlanCalendar({
  className,
  endDate,
  events,
  focusDate,
  onCreate,
  startDate,
  undated = false
}: PlanCalendarProps) {
  const tripStart = dateFromString(startDate) ?? new Date();
  const tripDays = Math.max(1, isoDaySpan(startDate, endDate));
  const tripView = kloqView('trip', tripDays);
  const key = JSON.stringify(events);
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for `events`
  const calendarEvents = useMemo(() => planCalendarEvents(events), [key]);
  // New plans fit inside the trip: the days around it are only there to read.
  const creating = onCreate !== undefined;
  const constraints = useMemo(() => {
    if (!creating) return readOnly;
    const first = dateFromString(startDate);
    const last = dateFromString(endDate);
    if (!(first && last)) return readOnly;
    last.setDate(last.getDate() + 1);
    // Kloq lets an all-day slot run to the end of `maxDate`'s day, one day too far here.
    const afterTrip = (slot: { allDay: boolean; end: Date }) =>
      slot.allDay && slot.end.getTime() > last.getTime();
    return { ...readOnly, minDate: first, maxDate: last, isSlotDisabled: afterTrip };
  }, [creating, endDate, startDate]);
  const context: PlanCalendarContextValue = {
    dayLabel: (date) => {
      const day = Math.round((date.getTime() - tripStart.getTime()) / 86_400_000) + 1;
      return day >= 1 && day <= tripDays ? `Day ${day}` : null;
    },
    tripStart,
    tripView,
    undated
  };
  // An undated trip's dates are made up, so its days are named "Day N" for assistive technology too.
  // Set while rendering, before the calendar's cells read it; removed when the calendar unmounts.
  const clearOverride = undated
    ? overrideFullDate((date) => context.dayLabel(date) ?? 'Outside the trip')
    : null;
  useEffect(() => clearOverride ?? undefined, [clearOverride]);
  return (
    <PlanCalendarProvider value={context}>
      <div
        className={cn(
          'h-[min(46rem,78dvh)] min-h-[28rem] overflow-hidden rounded-xl border border-border',
          className
        )}
        data-plan-calendar
        onDoubleClickCapture={onCreate ? undefined : blockCreation}
        onPointerDownCapture={onCreate ? undefined : blockCreation}
      >
        <Kloq
          commandPalette={false}
          components={slots}
          constraints={constraints}
          defaultDate={(focusDate ? dateFromString(focusDate) : null) ?? tripStart}
          defaultView={tripView}
          designMode={false}
          events={calendarEvents}
          keymap={keymap}
          {...(onCreate
            ? {
                // A drafted event is never kept: the host plans it and passes it back in.
                onEventsChange: (next: CalEvent[]) => {
                  const slot = draftedSlot(next, calendarEvents);
                  if (slot) onCreate(slot);
                },
                onSlotClick: ({
                  allDay,
                  end,
                  start
                }: {
                  allDay: boolean;
                  end: Date;
                  start: Date;
                }) => onCreate(clickedPlanSlot(start, end, allDay))
              }
            : {})}
          storage={false}
          theme="groam"
          // An undated trip keeps the trip view: month, year and list would show placeholder dates.
          {...(undated ? { view: tripView } : {})}
          workingHours={false}
        >
          <PlanCalendarToolbar />
          <PlanCalendarFocus date={focusDate} />
        </Kloq>
      </div>
    </PlanCalendarProvider>
  );
}
