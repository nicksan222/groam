import { Attachments } from '#convex/modules/media/attachments/index';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripTransfer } from '#convex/modules/travel/transfers/index';
import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';

async function loadVersionContent(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
  const [
    destinations,
    activities,
    stays,
    boundaryTransfers,
    destinationTransfers,
    activityTransfers,
    attachments,
    packingItems
  ] = await Promise.all([
    TripDestination.forTrip(ctx, tripId),
    ItineraryActivity.forTrip(ctx, tripId),
    TripStay.forTrip(ctx, tripId),
    TripTransfer.boundaryForTrip(ctx, tripId),
    TripTransfer.destinationForTrip(ctx, tripId),
    TripTransfer.activityForTrip(ctx, tripId),
    Attachments.forTrip(ctx, tripId),
    TripPacking.forTrip(ctx, tripId)
  ]);
  return {
    activities,
    activityTransfers,
    attachments,
    boundaryTransfers,
    destinations,
    destinationTransfers,
    stays,
    packingItems
  };
}

/** Loads itinerary rows that a version snapshot serializes. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class VersionContent {
  static load = loadVersionContent;
}

export type TripVersionContent = Awaited<ReturnType<typeof VersionContent.load>>;
