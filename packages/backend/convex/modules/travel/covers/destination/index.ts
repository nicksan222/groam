import { TripCover } from '#convex/modules/travel/covers/index';
import { internal } from '#convex-generated/api';
import type { Doc, Id } from '#convex-generated/dataModel';
import type { MutationCtx } from '#convex-generated/server';

const MAX_DESTINATIONS_PER_TRIP = 20;

function pendingCover(generation: number, existing?: Doc<'tripDestinations'>['cover']) {
  const existingAsset = existing && 'asset' in existing ? existing.asset : undefined;
  return {
    cover: {
      ...(existingAsset?.source === 'stock' ? { asset: existingAsset } : {}),
      generation,
      status: 'pending' as const
    },
    generation
  };
}

function coverStorageId(cover: Doc<'tripDestinations'>['cover']): Id<'_storage'> | undefined {
  return cover && 'asset' in cover ? cover.asset?.storageId : undefined;
}

/** Queues Wikipedia/Wikimedia stock photos for itinerary stops using the trip-cover pipeline. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class DestinationCover {
  static initial() {
    return pendingCover(1).cover;
  }

  static async schedule(
    ctx: MutationCtx,
    destinationId: Id<'tripDestinations'>,
    generation: number,
    delayMs = 0
  ): Promise<void> {
    await ctx.scheduler.runAfter(
      delayMs,
      internal.modules.travel.covers.destination.stock.generate,
      {
        attempt: 0,
        destinationId,
        generation
      }
    );
  }

  static async queue(
    ctx: MutationCtx,
    destination: Doc<'tripDestinations'>,
    delayMs = 0
  ): Promise<void> {
    const refresh = pendingCover((destination.cover?.generation ?? 0) + 1, destination.cover);
    await ctx.db.patch('tripDestinations', destination._id, { cover: refresh.cover });
    await DestinationCover.schedule(ctx, destination._id, refresh.generation, delayMs);
  }

  static async ensureForTrip(ctx: MutationCtx, tripId: Id<'trips'>): Promise<null> {
    const destinations = await ctx.db
      .query('tripDestinations')
      .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
      .take(MAX_DESTINATIONS_PER_TRIP);
    await Promise.all(
      destinations.flatMap((destination, index) =>
        destination.cover ? [] : [DestinationCover.queue(ctx, destination, index * 250)]
      )
    );
    return null;
  }

  static async deleteStorage(
    ctx: MutationCtx,
    destination: Pick<Doc<'tripDestinations'>, 'cover'>
  ): Promise<void> {
    await TripCover.deleteStorage(ctx, coverStorageId(destination.cover));
  }
}
