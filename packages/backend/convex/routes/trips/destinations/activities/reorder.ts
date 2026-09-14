import { v } from 'convex/values';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    destinationId: v.id('tripDestinations')
  },
  returns: v.null(),
  handler: async (ctx, { destinationId }) =>
    ItineraryActivity.reorderByDay(ctx, ctx.trip._id, destinationId)
});
