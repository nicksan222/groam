import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { dayCountLabel } from '@/features/trips/trip-duration';
import { formatTripDay } from '@/features/trips/trip-local-date-time';

/** The trip's travel window, or null while it is still open. */
export function windowValue(
  trip: Pick<TripDetail, 'dateNotes' | 'startDate' | 'totalDurationDays'>
): string | null {
  if (trip.startDate) {
    const start = formatTripDay(trip.startDate, 1);
    if (trip.totalDurationDays !== null && trip.totalDurationDays > 1) {
      return `${start} – ${formatTripDay(trip.startDate, trip.totalDurationDays)}`;
    }
    return start;
  }
  const notes = trip.dateNotes?.trim();
  return notes || null;
}

/** When the trip is and how long, as the sidebar trip switcher writes it: "Oct 3 – Oct 9 · 7 days". */
export function tripMetaLine(
  trip: Pick<TripDetail, 'dateNotes' | 'startDate' | 'totalDurationDays'>
): string | null {
  const length =
    typeof trip.totalDurationDays === 'number' ? dayCountLabel(trip.totalDurationDays) : null;
  return [windowValue(trip), length].filter(Boolean).join(' · ') || null;
}
