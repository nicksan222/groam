import type { Doc } from '#convex-generated/dataModel';

/** The trip length in days: the agreed total, else the ideal, else the minimum. */
export function tripDurationDays(trip: Pick<Doc<'trips'>, 'duration'>): number | undefined {
  return trip.duration?.totalDays ?? trip.duration?.idealDays ?? trip.duration?.minimumDays;
}
