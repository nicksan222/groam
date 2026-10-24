import { v } from 'convex/values';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { TripActivityValidators } from '#convex/modules/travel/activities/schema';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    activityId: v.id('tripDestinationActivities'),
    input: TripActivityValidators.input
  },
  returns: v.null(),
  handler: async (ctx, { activityId, input }) =>
    (await ItineraryActivity.find(ctx, ctx.trip._id, activityId)).update(input)
});
