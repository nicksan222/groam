import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { tripDurationInput } from '@/features/trips/trip-duration-input';
import type { TripState } from './trip-detail-types';

export function updateTripDuration(
  trip: TripDetail,
  tripState: Pick<TripState, 'update'>,
  totalDurationDays: number,
  startDate?: string
) {
  return tripState.update({
    ...(trip.initialBudget === null ? {} : { budget: { amount: trip.initialBudget } }),
    currency: trip.currency,
    dateNotes: trip.dateNotes ?? undefined,
    destination: trip.destination,
    duration: tripDurationInput(trip, totalDurationDays),
    name: trip.name,
    ...(startDate ? { startDate } : {})
  });
}
