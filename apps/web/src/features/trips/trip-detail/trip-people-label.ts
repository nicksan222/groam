import type { TripDetail } from '@/features/trips/hooks/use-trips';

/** Who is in the trip: just the going count when the whole group is going. */
export function peopleLabel(trip: Pick<TripDetail, 'groupMemberCount' | 'travelerCount'>) {
  return trip.groupMemberCount === trip.travelerCount
    ? `${trip.travelerCount} going`
    : `${trip.groupMemberCount} in group · ${trip.travelerCount} going`;
}
