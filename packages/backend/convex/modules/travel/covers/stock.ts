import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalAction, internalMutation, internalQuery } from '#convex-generated/server';
import { generateStockCover } from '#convex/modules/travel/covers/generate';
import { TripCover } from '#convex/modules/travel/covers/index';
import { TripCoverValidators } from '#convex/modules/travel/covers/schema';

function isAutoManagedCover(trip: {
  cover?: { asset?: { source: 'stock' | 'upload' }; generation: number; status: string };
}) {
  return trip.cover?.asset?.source !== 'upload';
}

export const request = internalQuery({
  args: { generation: v.number(), tripId: v.id('trips') },
  returns: v.union(
    v.object({
      excludedSourceUrl: v.union(v.string(), v.null()),
      query: v.string()
    }),
    v.null()
  ),
  handler: async (ctx, { generation, tripId }) => {
    const [trip, destination] = await Promise.all([
      ctx.db.get('trips', tripId),
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    ]);
    if (
      !trip ||
      !destination ||
      trip.cover?.generation !== generation ||
      trip.cover.status !== 'pending' ||
      !isAutoManagedCover(trip)
    ) {
      return null;
    }
    return {
      excludedSourceUrl:
        trip.cover.asset?.source === 'stock' ? trip.cover.asset.attribution.sourceUrl : null,
      query: destination.name
    };
  }
});

export const commit = internalMutation({
  args: {
    attribution: TripCoverValidators.attribution,
    generation: v.number(),
    storageId: v.id('_storage'),
    tripId: v.id('trips')
  },
  returns: v.boolean(),
  handler: async (ctx, { attribution, generation, storageId, tripId }) => {
    const [trip, destination] = await Promise.all([
      ctx.db.get('trips', tripId),
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    ]);
    if (
      !trip ||
      !destination ||
      trip.cover?.generation !== generation ||
      trip.cover.status !== 'pending' ||
      !isAutoManagedCover(trip)
    ) {
      return false;
    }

    const previousStorageId = trip.cover.asset?.storageId;
    await ctx.db.patch('trips', tripId, {
      cover: {
        asset: { attribution, source: 'stock', storageId },
        generation,
        status: 'ready'
      }
    });
    if (previousStorageId && previousStorageId !== storageId) {
      await TripCover.deleteIfUnreferenced(ctx, tripId, previousStorageId);
    }
    return true;
  }
});

export const markFailed = internalMutation({
  args: { generation: v.number(), tripId: v.id('trips') },
  returns: v.null(),
  handler: async (ctx, { generation, tripId }) => {
    const [trip, destination] = await Promise.all([
      ctx.db.get('trips', tripId),
      ctx.db
        .query('tripDestinations')
        .withIndex('by_tripId_and_position', (query) => query.eq('tripId', tripId))
        .first()
    ]);
    if (
      trip &&
      trip.cover?.generation === generation &&
      trip.cover.status === 'pending' &&
      isAutoManagedCover(trip)
    ) {
      const existingAsset = trip.cover.asset;
      await ctx.db.patch('trips', tripId, {
        cover: destination
          ? existingAsset?.source === 'stock'
            ? { asset: existingAsset, generation, status: 'ready' }
            : { generation, status: 'failed' }
          : undefined
      });
    }
    return null;
  }
});

export const generate = internalAction({
  args: { attempt: v.number(), generation: v.number(), tripId: v.id('trips') },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> =>
    await generateStockCover(ctx, {
      attempt: args.attempt,
      commit: async ({ attribution, storageId }): Promise<boolean> =>
        await ctx.runMutation(internal.modules.travel.covers.stock.commit, {
          attribution,
          generation: args.generation,
          storageId,
          tripId: args.tripId
        }),
      fail: async (): Promise<unknown> =>
        await ctx.runMutation(internal.modules.travel.covers.stock.markFailed, {
          generation: args.generation,
          tripId: args.tripId
        }),
      label: 'trip',
      request: async (): Promise<{ excludedSourceUrl: string | null; query: string } | null> =>
        await ctx.runQuery(internal.modules.travel.covers.stock.request, {
          generation: args.generation,
          tripId: args.tripId
        }),
      retry: async (delayMs): Promise<unknown> =>
        await ctx.scheduler.runAfter(delayMs, internal.modules.travel.covers.stock.generate, {
          ...args,
          attempt: args.attempt + 1
        })
    })
});
