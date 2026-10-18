import { v } from 'convex/values';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripActivityValidators } from '#convex/modules/travel/activities/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: TripActivityValidators.addArgs,
  returns: v.id('tripDestinationActivities'),
  handler: (ctx, { destinationId, input }) =>
    ItineraryActivity.add(ctx, ctx.trip._id, destinationId, input)
});
