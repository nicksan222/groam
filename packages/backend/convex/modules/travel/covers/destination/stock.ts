import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { internalAction, internalMutation, internalQuery } from '#convex-generated/server';
import { generateStockCover } from '#convex/modules/travel/covers/generate';
import { TripCoverValidators } from '#convex/modules/travel/covers/schema';

export const request = internalQuery({
  args: { destinationId: v.id('tripDestinations'), generation: v.number() },
  returns: v.union(
    v.object({
      excludedSourceUrl: v.union(v.string(), v.null()),
      query: v.string()
    }),
    v.null()
  ),
  handler: async (ctx, { destinationId, generation }) => {
    const destination = await ctx.db.get('tripDestinations', destinationId);
    if (
      !destination ||
      destination.cover?.generation !== generation ||
      destination.cover.status !== 'pending'
    ) {
      return null;
    }
    return {
      excludedSourceUrl:
        destination.cover.asset?.source === 'stock'
          ? destination.cover.asset.attribution.sourceUrl
          : null,
      query: destination.name
    };
  }
});

export const commit = internalMutation({
  args: {
    attribution: TripCoverValidators.attribution,
    destinationId: v.id('tripDestinations'),
    generation: v.number(),
    storageId: v.id('_storage')
  },
  returns: v.boolean(),
  handler: async (ctx, { attribution, destinationId, generation, storageId }) => {
    const destination = await ctx.db.get('tripDestinations', destinationId);
    if (
      !destination ||
      destination.cover?.generation !== generation ||
      destination.cover.status !== 'pending'
    ) {
      return false;
    }
    await ctx.db.patch('tripDestinations', destinationId, {
      cover: {
        asset: { attribution, source: 'stock', storageId },
        generation,
        status: 'ready'
      }
    });
    return true;
  }
});

export const markFailed = internalMutation({
  args: { destinationId: v.id('tripDestinations'), generation: v.number() },
  returns: v.null(),
  handler: async (ctx, { destinationId, generation }) => {
    const destination = await ctx.db.get('tripDestinations', destinationId);
    if (
      destination &&
      destination.cover?.generation === generation &&
      destination.cover.status === 'pending'
    ) {
      const existingAsset = destination.cover.asset;
      await ctx.db.patch('tripDestinations', destinationId, {
        cover:
          existingAsset?.source === 'stock'
            ? { asset: existingAsset, generation, status: 'ready' }
            : { generation, status: 'failed' }
      });
    }
    return null;
  }
});

export const generate = internalAction({
  args: {
    attempt: v.number(),
    destinationId: v.id('tripDestinations'),
    generation: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> =>
    await generateStockCover(ctx, {
      attempt: args.attempt,
      commit: async ({ attribution, storageId }): Promise<boolean> =>
        await ctx.runMutation(internal.modules.travel.covers.destination.stock.commit, {
          attribution,
          destinationId: args.destinationId,
          generation: args.generation,
          storageId
        }),
      fail: async (): Promise<unknown> =>
        await ctx.runMutation(internal.modules.travel.covers.destination.stock.markFailed, {
          destinationId: args.destinationId,
          generation: args.generation
        }),
      label: 'destination',
      request: async (): Promise<{ excludedSourceUrl: string | null; query: string } | null> =>
        await ctx.runQuery(internal.modules.travel.covers.destination.stock.request, {
          destinationId: args.destinationId,
          generation: args.generation
        }),
      retry: async (delayMs): Promise<unknown> =>
        await ctx.scheduler.runAfter(
          delayMs,
          internal.modules.travel.covers.destination.stock.generate,
          { ...args, attempt: args.attempt + 1 }
        )
    })
});
