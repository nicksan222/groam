import type { Id } from '#convex-generated/dataModel';
import type { MutationCtx, QueryCtx } from '#convex-generated/server';
import { Attachments } from '#convex/modules/media/attachments/index';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { TripPacking } from '#convex/modules/travel/packing/index';
import { TripStay } from '#convex/modules/travel/stays/index';
import { TripTransfer } from '#convex/modules/travel/transfers/index';

async function loadVersionContent(ctx: MutationCtx | QueryCtx, tripId: Id<'trips'>) {
  const [
    destinations,
    activities,
    stays,
    boundaryTransfers,
    destinationTransfers,
    activityTransfers,
    attachments,
    packingItems,
    packingBringers
  ] = await Promise.all([
    TripDestination.forTrip(ctx, tripId),
    ItineraryActivity.forTrip(ctx, tripId),
    TripStay.forTrip(ctx, tripId),
    TripTransfer.boundaryForTrip(ctx, tripId),
    TripTransfer.destinationForTrip(ctx, tripId),
    TripTransfer.activityForTrip(ctx, tripId),
    Attachments.forTrip(ctx, tripId),
    TripPacking.forTrip(ctx, tripId),
    TripPacking.bringersForTrip(ctx, tripId)
  ]);
  return {
    activities,
    activityTransfers,
    attachments,
    boundaryTransfers,
    destinations,
    destinationTransfers,
    packingBringers,
    packingItems,
    stays
  };
}

/** Loads itinerary rows that a version snapshot serializes. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class VersionContent {
  static load = loadVersionContent;
}

export type TripVersionContent = Awaited<ReturnType<typeof VersionContent.load>>;
