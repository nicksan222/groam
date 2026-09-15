import { v } from 'convex/values';
import { TripDestination } from '#convex/modules/travel/destinations/index';
import { destinationMutation } from '#convex/modules/travel/trips/ctx';

export const run = destinationMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => TripDestination.fromCtx(ctx).delete()
});
