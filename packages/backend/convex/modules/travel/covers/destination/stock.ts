import { v } from 'convex/values';
import { TripCoverValidators } from '#convex/modules/travel/covers/schema';
import { downloadStockCover, searchWikipediaCover } from '#convex/modules/travel/covers/stock';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery
} from '#convex-generated/server';

const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000];

async function deleteTemporaryCover(ctx: ActionCtx, storageId: Id<'_storage'>) {
  try {
    await ctx.storage.delete(storageId);
  } catch (error) {
    console.warn('Unable to clean up a temporary destination cover', error);
  }
}

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
  handler: async (ctx, args) => {
    let storedId: Id<'_storage'> | undefined;
    try {
      const pending: { excludedSourceUrl: string | null; query: string } | null =
        await ctx.runQuery(internal.modules.travel.covers.destination.stock.request, {
          destinationId: args.destinationId,
          generation: args.generation
        });
      if (!pending) return null;

      const candidates = await searchWikipediaCover(
        pending.query,
        pending.excludedSourceUrl ?? undefined
      );
      const downloaded = await downloadStockCover(candidates);
      storedId = await ctx.storage.store(downloaded.blob);
      const committed: boolean = await ctx.runMutation(
        internal.modules.travel.covers.destination.stock.commit,
        {
          attribution: downloaded.attribution,
          destinationId: args.destinationId,
          generation: args.generation,
          storageId: storedId
        }
      );
      if (!committed) await deleteTemporaryCover(ctx, storedId);
    } catch (error: unknown) {
      if (storedId) await deleteTemporaryCover(ctx, storedId);
      const retryDelay = RETRY_DELAYS_MS[args.attempt];
      if (retryDelay !== undefined) {
        await ctx.scheduler.runAfter(
          retryDelay,
          internal.modules.travel.covers.destination.stock.generate,
          {
            ...args,
            attempt: args.attempt + 1
          }
        );
      } else {
        console.warn('Unable to generate a Wikipedia destination cover', error);
        await ctx.runMutation(internal.modules.travel.covers.destination.stock.markFailed, {
          destinationId: args.destinationId,
          generation: args.generation
        });
      }
    }
    return null;
  }
});
