import { v } from 'convex/values';
import { mutation } from '#convex-generated/server';
import { Research } from '#convex/modules/discussions/research/index';

/** Starts a research on a trip. Idempotent on `clientRequestId`. Anyone who can see the trip may. */
export const run = mutation({
  args: {
    brief: v.optional(v.string()),
    clientRequestId: v.string(),
    title: v.string(),
    tripId: v.id('trips')
  },
  returns: v.id('discussions'),
  handler: (ctx, args) => Research.create(ctx, args)
});
