import { createContext, useContext } from 'react';
import type { KloqView } from '#src/vendor/kloq/lib/calendar-types';

export type PlanCalendarContextValue = {
  /** A trip-relative label such as "Day 3", or null for a day outside the trip. */
  dayLabel: (date: Date) => string | null;
  /** First day of the trip, where "Whole trip" returns to. */
  tripStart: Date;
  /** The view that fits the whole trip. */
  tripView: KloqView;
  /** The trip has no real dates yet: only "Day N" is shown, never a weekday or month. */
  undated: boolean;
};

const PlanCalendarContext = createContext<PlanCalendarContextValue | null>(null);

export const PlanCalendarProvider = PlanCalendarContext.Provider;

export function usePlanCalendar(): PlanCalendarContextValue {
  const value = useContext(PlanCalendarContext);
  if (!value) throw new Error('usePlanCalendar must be used inside <PlanCalendar>');
  return value;
}
