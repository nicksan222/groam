import { stringFromDate } from '#src/lib/calendar-date';
import type { CalEvent, EventColor, KloqView } from '#src/vendor/kloq/lib/calendar-types';

/** What a plan is; each kind keeps one chart colour across every view. */
export type PlanCalendarTone = 'activity' | 'place' | 'stay' | 'travel';

/** One plan on the calendar. Dates are `YYYY-MM-DD`, times wall-clock `HH:MM` without a zone. */
export type PlanCalendarEvent = {
  id: string;
  title: string;
  tone: PlanCalendarTone;
  location?: string;
  /** Free text shown as the event's description. */
  notes?: string;
  startDate: string;
  /** Inclusive last day; defaults to `startDate`. */
  endDate?: string;
  /** Omit for an all-day span. */
  startTime?: string | null;
  endTime?: string | null;
};

/**
 * A stretch of the calendar someone picked to plan in. Dates are `YYYY-MM-DD` and the end day is
 * inclusive; times are wall-clock `HH:MM`, both null for whole days.
 */
export type PlanCalendarSlot = {
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
};

/** `trip` fits the whole trip in one strip of day columns; the rest are the calendar's own views. */
export type PlanCalendarView = 'trip' | 'day' | 'week' | 'month' | 'agenda';

const toneColors: Record<PlanCalendarTone, EventColor> = {
  activity: 'blue',
  place: 'emerald',
  stay: 'violet',
  travel: 'amber'
};

/** Length a plan gets when only its start time is known. */
const OPEN_END_MINUTES = 60;
const MAX_TRIP_COLUMNS = 14;

export function addIsoDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function minutesOf(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function wallClock(date: string, minutes: number): string {
  const day = addIsoDays(date, Math.floor(minutes / 1440));
  const inDay = ((minutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(inDay / 60)).padStart(2, '0');
  return `${day}T${hours}:${String(inDay % 60).padStart(2, '0')}:00`;
}

function timedEnd(event: PlanCalendarEvent, startTime: string): string {
  const endDate = event.endDate ?? event.startDate;
  const start = minutesOf(startTime);
  if (!event.endTime) {
    // An explicit last day already defines a positive span. Keep it even when
    // its clock time is open; adding an hour could spill into another day.
    if (endDate > event.startDate) return wallClock(endDate, start);
    return wallClock(event.startDate, start + OPEN_END_MINUTES);
  }
  const end = minutesOf(event.endTime);
  // An end before the start on the same day reads as "past midnight".
  if (endDate === event.startDate && end <= start)
    return wallClock(event.startDate, end + (end === start ? OPEN_END_MINUTES : 1440));
  return wallClock(endDate, end);
}

/** Calendar events for the plans; times stay on the traveller's wall clock. */
export function planCalendarEvents(events: readonly PlanCalendarEvent[]): CalEvent[] {
  return events.map((event) => {
    const shared = {
      id: event.id,
      title: event.title,
      color: toneColors[event.tone],
      readOnly: true,
      ...(event.location ? { location: event.location } : {}),
      ...(event.notes ? { description: event.notes } : {})
    };
    if (!event.startTime) {
      const last = event.endDate ?? event.startDate;
      return { ...shared, allDay: true, start: event.startDate, end: addIsoDays(last, 1) };
    }
    return {
      ...shared,
      start: wallClock(event.startDate, minutesOf(event.startTime)),
      end: timedEnd(event, event.startTime)
    };
  });
}

/** The calendar view for a Groam view; a trip longer than two weeks reads week by week. */
export function kloqView(view: PlanCalendarView, tripDays: number): KloqView {
  if (view !== 'trip') return view;
  if (tripDays <= 1) return 'day';
  return tripDays > MAX_TRIP_COLUMNS ? 'week' : tripDays;
}

/** Inclusive day count between two `YYYY-MM-DD` dates. */
export function isoDaySpan(startDate: string, endDate: string): number {
  const ms = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

// Kloq runs without a display time zone here, so its instants read back on the local wall clock.
function clockOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** A click on empty time: from the half hour it landed in, one hour long but never past midnight. */
export function clickedPlanSlot(start: Date, end: Date, allDay: boolean): PlanCalendarSlot {
  if (allDay) return planCalendarSlot(start, end, true);
  const from = new Date(start);
  from.setMinutes(from.getMinutes() - (from.getMinutes() % 30), 0, 0);
  const midnight = new Date(from);
  midnight.setHours(24, 0, 0, 0);
  const to = new Date(Math.min(from.getTime() + OPEN_END_MINUTES * 60_000, midnight.getTime()));
  return planCalendarSlot(from, to, false);
}

/** The slot a calendar gesture picked; an all-day `end` is the exclusive day after the last. */
export function planCalendarSlot(start: Date, end: Date, allDay: boolean): PlanCalendarSlot {
  const startDate = stringFromDate(start);
  if (allDay) {
    const last = addIsoDays(stringFromDate(end), -1);
    return {
      startDate,
      endDate: last < startDate ? startDate : last,
      startTime: null,
      endTime: null
    };
  }
  return {
    startDate,
    endDate: stringFromDate(end),
    startTime: clockOf(start),
    endTime: clockOf(end)
  };
}
