import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { dayCountLabel } from '@/features/trips/trip-duration';
import { windowValue } from '@/features/trips/trip-overview/trip-window-value';
import type { TripToolbarFacts } from '@/types/trips';

export function tripToolbarFacts(trip: TripDetail): TripToolbarFacts {
  return {
    destination: trip.destination.status === 'known' ? trip.destination.name : 'Destination open',
    length: trip.totalDurationDays === null ? null : dayCountLabel(trip.totalDurationDays),
    window: windowValue(trip) ?? 'Flexible dates'
  };
}
