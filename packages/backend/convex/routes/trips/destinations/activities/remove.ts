import { v } from 'convex/values';
import { ItineraryActivity } from '#convex/modules/travel/activities/index';
import { mutableTripMutation } from '#convex/modules/travel/trips/ctx';

export const run = mutableTripMutation({
  args: {
    activityId: v.id('tripDestinationActivities')
  },
  returns: v.null(),
  handler: async (ctx, { activityId }) =>
    (await ItineraryActivity.find(ctx, ctx.trip._id, activityId)).delete()
});
