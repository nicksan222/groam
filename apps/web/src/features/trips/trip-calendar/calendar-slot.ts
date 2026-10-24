import { isoDaySpan, type PlanCalendarSlot } from '@groam/ui/lib/plan-calendar';
import type { CalendarActivityDraft } from '@/types/trip-planner';
import type { TimeBlock } from '@/types/trips';

/** The part of the day a start time falls in; a slot without one takes the whole day. */
export function timeBlockFor(startTime: string | null): TimeBlock {
  if (!startTime) return 'full_day';
  const hour = Number(startTime.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * The activity a calendar slot plans, in trip days counted from the calendar's Day 1. A timed
 * slot that runs to midnight stays on its first day and is left open-ended, since an activity's
 * end on its own day must come after its start.
 */
export function calendarActivityDraft(
  calendarStart: string,
  slot: PlanCalendarSlot
): CalendarActivityDraft {
  const day = isoDaySpan(calendarStart, slot.startDate);
  const toMidnight = slot.endTime === '00:00' && slot.endDate > slot.startDate;
  return {
    day,
    endDay: toMidnight ? day : Math.max(day, isoDaySpan(calendarStart, slot.endDate)),
    startTime: slot.startTime,
    endTime: toMidnight ? null : slot.endTime,
    timeBlock: timeBlockFor(slot.startTime)
  };
}
