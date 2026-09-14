import { v } from 'convex/values';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { destinationMutation } from '#convex/modules/travel/trips/ctx';

export const run = destinationMutation({
  args: { direction: v.union(v.literal('earlier'), v.literal('later')) },
  returns: v.null(),
  handler: async (ctx, { direction }) => TripDestination.fromCtx(ctx).move(direction)
});
