import type { tripTables } from '#convex/modules/travel/trips/schema';

/**
 * The trip length in days: the agreed total, else the ideal, else the minimum. Typed from the
 * table validator, so rule kinds (part of the schema) can call it.
 */
export function tripDurationDays(
  trip: Pick<(typeof tripTables)['trips']['validator']['type'], 'duration'>
): number | undefined {
  return trip.duration?.totalDays ?? trip.duration?.idealDays ?? trip.duration?.minimumDays;
}
