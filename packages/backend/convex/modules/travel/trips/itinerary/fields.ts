import { type GenericValidator, v } from 'convex/values';
import { TripValidators } from '#convex/modules/travel/trips/schema';

function itineraryElementFields<Schedule extends GenericValidator>(schedule: Schedule) {
  return {
    address: v.optional(v.string()),
    cost: v.optional(TripValidators.cost),
    destinationId: v.id('tripDestinations'),
    notes: v.optional(v.string()),
    position: v.number(),
    schedule,
    title: v.string(),
    tripId: v.id('trips')
  };
}

/** Shared stay/activity table fields. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class ItineraryFields {
  static element = itineraryElementFields;
}
